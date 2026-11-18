// Background loading and effects for story scenes.
window.StoryBackgroundTransition = class StoryBackgroundTransition {
    constructor() {
        this.cache = new Map();
        this.animations = new Set();
        this.layers = new Set();
        this.generation = 0;
        this.busy = false;
        this.onPageHide = () => this.cancel();
        window.addEventListener('pagehide', this.onPageHide);
    }

    currentImage() {
        const background = getComputedStyle(document.body).backgroundImage;
        const match = /^url\(["']?(.*?)["']?\)$/.exec(background);
        return match ? match[1] : null;
    }

    preload(source) {
        if (!source) return Promise.resolve();
        const url = new URL(source, document.baseURI).href;
        if (this.cache.has(url)) return this.cache.get(url);
        const promise = new Promise((resolve, reject) => {
            const image = new Image();
            const timer = setTimeout(() => finish(new Error('Background load timed out: ' + url)), 15000);
            function finish(error) {
                clearTimeout(timer);
                image.onload = image.onerror = null;
                if (error) reject(error);
                else resolve(image); // Retain the decoded image in the cache.
            }
            image.onload = () => image.decode().then(() => finish(), finish);
            image.onerror = () => finish(new Error('Background load failed: ' + url));
            image.src = url;
        }).catch(error => {
            this.cache.delete(url);
            throw error;
        });
        this.cache.set(url, promise);
        return promise;
    }

    layer(transition) {
        const layer = document.createElement('div');
        layer.className = 'story-transition-layer';
        layer.dataset.transition = transition;
        layer.setAttribute('aria-hidden', 'true');
        this.layers.add(layer);
        document.body.appendChild(layer);
        return layer;
    }

    async fade(layer, from, to, duration) {
        const animation = layer.animate([{ opacity: from }, { opacity: to }], {
            duration, easing: 'ease-in-out', fill: 'forwards',
        });
        this.animations.add(animation);
        try {
            await animation.finished;
            layer.style.opacity = String(to);
        } catch {
            // cancel() settles an interrupted animation without a late commit.
        } finally {
            animation.cancel();
            this.animations.delete(animation);
        }
    }

    async show(source, { transition = 'black', onCommit = () => {} } = {}) {
        if (this.busy) return false;
        this.busy = true;
        document.body.dataset.storyTransitioning = 'true';
        const generation = ++this.generation;
        const current = () => generation === this.generation;
        const cancelled = new Promise(resolve => { this.resolveCancellation = resolve; });
        const painted = () => Promise.race([
            new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
            cancelled,
        ]);
        const image = source === null ? null : source || this.currentImage();
        const type = ['black', 'white', 'crossfade'].includes(transition) ? transition : 'black';
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600;
        try {
            // Never remove the old background or start an effect before decode.
            try {
                await Promise.race([this.preload(image), cancelled]);
            } catch (error) {
                if (current()) {
                    console.warn(error.message);
                    onCommit(); // A broken picture must not trap the reader on a line.
                }
                return false;
            }
            if (!current()) return false;

            const background = image ? 'url(' + JSON.stringify(new URL(image, document.baseURI).href) + ')' : 'none';
            if (transition === 'none') {
                document.body.style.backgroundImage = background;
                onCommit();
                return true;
            }
            const layer = this.layer(type);
            if (type === 'crossfade') {
                layer.style.backgroundImage = background;
                layer.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
                await this.fade(layer, 0, 1, duration);
                if (!current()) return false;
                // The incoming image is still fully opaque while the body takes over.
                document.body.style.backgroundImage = background;
                onCommit();
                await painted();
                if (!current()) return false;
            } else {
                layer.style.backgroundColor = type === 'white' ? '#fff' : '#000';
                await this.fade(layer, 0, 1, duration / 2);
                if (!current()) return false;
                document.body.style.backgroundImage = background;
                onCommit();
                await painted();
                if (!current()) return false;
                await this.fade(layer, 1, 0, duration / 2);
                if (!current()) return false;
            }
            return true;
        } finally {
            if (current()) this.cancel();
        }
    }

    cancel() {
        this.generation++;
        this.resolveCancellation?.();
        this.resolveCancellation = null;
        for (const animation of this.animations) animation.cancel();
        this.animations.clear();
        for (const layer of this.layers) layer.remove();
        this.layers.clear();
        this.busy = false;
        delete document.body.dataset.storyTransitioning;
    }

    destroy() {
        this.cancel();
        window.removeEventListener('pagehide', this.onPageHide);
    }
};
