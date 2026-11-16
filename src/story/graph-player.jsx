import React, { useEffect, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';

function music(source) {
  const audio = document.getElementById('audioPlayer');
  if (!audio || source === undefined) return;
  if (source === null) {
    audio.dataset.musicSuspended = 'true';
    audio.pause();
    return;
  }
  const url = new URL(source, document.baseURI).href;
  // An inherited or identical track must not even call play(): the current
  // media instance keeps advancing while dialogue and backgrounds change.
  if (audio.src === url && audio.dataset.musicSuspended !== 'true') return;
  delete audio.dataset.musicSuspended;
  if (audio.src !== url) audio.src = url;
  window.initial_music?.();
}

export default function GraphPlayer({ scene }) {
  const [cursor, setCursor] = useState(null);
  const [ready, setReady] = useState(false);
  const [boxReady, setBoxReady] = useState(false);
  const [seen, setSeen] = useState(new Set());
  const [awards, setAwards] = useState([]);
  const [error, setError] = useState('');
  const [player, setPlayer] = useState(() => window.GameProfile.getName());
  const backgrounds = useRef(null);
  const position = useRef(null);
  const lastLine = useRef({});
  const visited = useRef(new Set());
  const busy = useRef(true);
  const leaving = useRef(false);
  const generation = useRef(0);
  const introTimer = useRef(null);
  const afterAwards = useRef(null);
  const pendingAwards = useRef([]);
  const text = value => (value || '').replaceAll('{player}', () => player);

  function cancel() {
    generation.current++;
    clearTimeout(introTimer.current);
    backgrounds.current?.cancel();
  }

  function exit(to) {
    if (leaving.current) return;
    leaving.current = true;
    busy.current = true;
    cancel();
    window.location.href = to;
  }

  function preload(node, index) {
    const targets = node.type === 'choice' ? node.choices.map(option => option.to) : [node.next];
    const sources = [node.lines?.[index + 1]?.background, ...targets.map(id => {
      const next = scene.nodes[id];
      return next?.background || next?.lines?.[0]?.background;
    })];
    for (const source of sources) backgrounds.current?.preload(source).catch(() => {});
  }

  async function present(id, index = 0) {
    if (leaving.current) return;
    cancel();
    const token = generation.current;
    const current = () => token === generation.current && !leaving.current;
    const node = scene.nodes[id];
    if (node.type === 'exit') { exit(node.to); return; }
    busy.current = true;
    const line = node.lines?.[index];
    const source = line?.background || (index === 0 ? node.background : undefined);
    const transition = line?.transition || (index === 0 ? node.transition : undefined);
    const changed = source && new URL(source, document.baseURI).href !== backgrounds.current.currentImage();
    const commit = () => {
      if (!current()) return;
      if (line) lastLine.current = line;
      position.current = { id, index };
      document.getElementById('story-player').dataset.storyNode = id;
      music(line?.music !== undefined ? line.music : index === 0 ? node.music : undefined);
      flushSync(() => {
        setCursor({ id, index });
        setReady(true);
      });
      preload(node, index);
    };
    if (changed || transition) {
      await backgrounds.current.show(source, { transition, onCommit: commit });
    } else {
      commit();
    }
    if (!current()) return;
    busy.current = false;
    if (node.type === 'intro') {
      introTimer.current = setTimeout(() => {
        if (current()) void present(node.next);
      }, node.duration ?? 2000);
    }
  }

  useEffect(() => {
    const controller = new window.StoryBackgroundTransition();
    backgrounds.current = controller;
    const refreshName = () => setPlayer(window.GameProfile.getName());
    window.addEventListener('game:player-name-changed', refreshName);
    // Leave React's mount phase before committing the initial story frame.
    let disposed = false;
    queueMicrotask(() => { if (!disposed) void present(scene.start); });
    return () => {
      disposed = true;
      cancel();
      controller.destroy();
      window.removeEventListener('game:player-name-changed', refreshName);
    };
  }, [scene]);

  function advance(event) {
    if (!ready || !boxReady || busy.current || leaving.current || pendingAwards.current.length || event.detail > 1) return;
    const active = position.current;
    const node = scene.nodes[active.id];
    if (node.type !== 'dialogue') return;
    void (active.index + 1 < node.lines.length
      ? present(active.id, active.index + 1)
      : present(node.next));
  }

  function choose(event, option) {
    event.stopPropagation();
    if (!ready || busy.current || leaving.current || pendingAwards.current.length || event.detail > 1) return;
    const active = position.current;
    if (active.id !== cursor.id || scene.nodes[active.id].type !== 'choice') return;
    const key = JSON.stringify([active.id, option.id]);
    const wasSeen = visited.current.has(key);
    if (wasSeen && ['hide', 'disable'].includes(option.repeat)) return;
    busy.current = true;
    try {
      let newAwards = [];
      if (!wasSeen && option.effects?.length) {
        const { unlocked } = window.GameProgress.applyStoryEffects(option.effects);
        newAwards = option.effects.filter(effect => effect.type === 'achievement' && unlocked.includes(effect.id))
          .filter((effect, i, all) => all.findIndex(other => other.id === effect.id) === i);
      }
      visited.current.add(key);
      setSeen(new Set(visited.current));
      setError('');
      if (newAwards.length) {
        // Do not let an introduction expire behind an achievement popup.
        afterAwards.current = option.to;
        pendingAwards.current = newAwards;
        setAwards(newAwards);
      } else {
        void present(option.to);
      }
    } catch (failure) {
      busy.current = false;
      setError(failure.message || '无法保存选择，请重试。');
    }
  }

  function closeAward(event) {
    if (!pendingAwards.current.length || event.detail > 1) return;
    const remaining = pendingAwards.current.slice(1);
    pendingAwards.current = remaining;
    setAwards(remaining);
    if (!remaining.length && afterAwards.current !== null) {
      const target = afterAwards.current;
      afterAwards.current = null;
      void present(target);
    }
  }

  function skip(event, target) {
    event.stopPropagation();
    if (leaving.current || event.detail > 1 || pendingAwards.current.length) return;
    setError('');
    if (target.node !== undefined) void present(target.node);
    else exit(target.exit);
  }

  const node = cursor ? scene.nodes[cursor.id] : null;
  const line = node?.lines?.[cursor.index] || lastLine.current;
  const font = { '--story-font-family': line.fontFamily || node?.fontFamily || scene.fontFamily };
  const skipTarget = node?.skip ?? scene.skip;
  const controls = document.querySelector('[data-settings-host]');
  const award = awards[0];
  return <>
    {controls && skipTarget && createPortal(
      <button type="button" data-story-skip title="跳过剧情" aria-label="跳过剧情"
        onClick={event => skip(event, skipTarget)}>
        <img src="../../assets/images/skip_dialogue.png" alt="" draggable={false} />
      </button>, controls)}
    {ready && node?.type === 'intro' &&
      <div className="centered-text" data-story-intro style={{ '--story-font-family': node.fontFamily || scene.fontFamily }}>
        {text(node.text)}
      </div>}
    {ready && node?.type === 'dialogue' && line.caption &&
      <div className="centered-text1" style={{ ...font, opacity: 1 }}>{text(line.caption)}</div>}
    <div className="image-container" onClick={advance}
      style={{ ...font, visibility: ready && boxReady && node?.type !== 'intro' ? 'visible' : 'hidden' }}>
      <img id="slideImage" src={scene.boxImage || '../../assets/images/ui/text-box.png'} alt=""
        draggable={false} onLoad={() => setBoxReady(true)} />
      <div className="topLeftText">{text(line.speaker)}</div>
      <div className="text" style={{ whiteSpace: 'pre-line' }}>{text(line.text)}</div>
    </div>
    {ready && node?.type === 'choice' &&
      <div className="button-container" style={{ display: 'flex' }}>
        {node.choices.map(option => {
          const wasSeen = seen.has(JSON.stringify([cursor.id, option.id]));
          if (wasSeen && option.repeat === 'hide') return null;
          return <button key={option.id} className="button" type="button"
            data-story-choice={option.id} data-choice-kind={option.kind || 'advance'}
            data-choice-seen={wasSeen ? 'true' : 'false'} disabled={wasSeen && option.repeat === 'disable'}
            style={{ border: 0, padding: 0, backgroundColor: 'transparent',
              '--story-font-family': option.fontFamily || node.fontFamily || scene.fontFamily }}
            onClick={event => choose(event, option)}>
            <span className="button-text">{text(option.label)}</span>
          </button>;
        })}
        {error && <p className="story-choice-error" role="alert">{error}</p>}
      </div>}
    {award && createPortal(
      <div className="story-achievement-backdrop">
        <div id="achievement_popup" role="dialog" aria-modal="true" aria-label="解锁成就" style={{ display: 'flex' }}>
          <p className="story-achievement-heading">解锁成就</p>
          <div className="achievement_title_container"><p className="achievement_title">{award.title || award.id}</p></div>
          <div className="achievement_content_container"><p className="achievement_content">{award.description}</p></div>
          <button type="button" id="achievement_confirm_button_text" data-story-achievement-close autoFocus
            onClick={closeAward}>确认</button>
        </div>
      </div>, document.body)}
  </>;
}
