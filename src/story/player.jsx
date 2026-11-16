import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal, flushSync } from 'react-dom';
import '../../game/story/scripts/background-transition.js';
import GraphPlayer from './graph-player.jsx';
import { validateGraph } from './graph-model.mjs';

function navigate(target) {
  if (typeof target === 'function') target();
  else if (target) {
    window.preserve_story_music?.(target);
    window.location.href = target;
  }
}

function StoryPlayer({ scene }) {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [boxReady, setBoxReady] = useState(false);
  const leaving = useRef(false);
  const backgrounds = useRef(null);
  const advancing = useRef(false);
  const [player, setPlayer] = useState(() => window.GameProfile.getName());
  const text = value => (value || '').replaceAll('{player}', () => player);

  useEffect(() => {
    const refreshName = () => setPlayer(window.GameProfile.getName());
    window.addEventListener('game:player-name-changed', refreshName);
    return () => window.removeEventListener('game:player-name-changed', refreshName);
  }, []);

  useEffect(() => {
    const controller = new window.StoryBackgroundTransition();
    backgrounds.current = controller;
    let disposed = false;
    const introduction = document.querySelector(scene.intro?.selector || '#text1');
    const first = scene.lines[0] || {};
    const firstImage = first.background || scene.intro?.background || controller.currentImage();
    controller.preload(firstImage).catch(() => {});
    const timer = setTimeout(async () => {
      if (disposed || leaving.current) return;
      await controller.show(firstImage, {
        transition: first.transition || scene.intro?.transition,
        onCommit: () => { if (introduction) introduction.hidden = true; },
      });
      if (!disposed && !leaving.current) setReady(true);
    }, introduction ? 2000 : 0);
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.destroy();
    };
  }, [scene]);

  useEffect(() => {
    backgrounds.current?.preload(scene.lines[index + 1]?.background).catch(() => {});
  }, [scene, index]);

  function leave(target) {
    if (leaving.current) return;
    leaving.current = true;
    backgrounds.current?.cancel();
    navigate(target);
  }

  async function advance(event) {
    if (!ready || !boxReady || finished || leaving.current || advancing.current || event.detail > 1) return;
    if (index + 1 < scene.lines.length) {
      const nextIndex = index + 1;
      const next = scene.lines[nextIndex];
      advancing.current = true;
      try {
        if (next.background || next.transition) {
          await backgrounds.current.show(next.background, {
            transition: next.transition,
            onCommit: () => flushSync(() => setIndex(nextIndex)),
          });
        } else {
          setIndex(nextIndex);
        }
      } finally {
        advancing.current = false;
      }
    } else {
      setFinished(true);
      if (!scene.inlineChoice) leave(scene.next);
    }
  }

  function activate(event, target) {
    event.stopPropagation();
    leave(target);
  }

  const line = scene.lines[index] || {};
  const choice = finished ? scene.inlineChoice : null;
  const font = { '--story-font-family': (choice || line).fontFamily || scene.fontFamily };
  const skipTarget = scene.skip ?? scene.next;
  const controls = document.querySelector('[data-settings-host]');
  return <>
    {controls && skipTarget && createPortal(
      <button type="button" data-story-skip title="跳过剧情" aria-label="跳过剧情"
        onClick={event => activate(event, skipTarget)}>
        <img src="../../assets/images/skip_dialogue.png" alt="" draggable={false} />
      </button>, controls)}
    {ready && line.caption && !finished &&
      <div className="centered-text1" style={{ ...font, opacity: 1 }}>{text(line.caption)}</div>}
    <div className="image-container" onClick={advance}
      style={{ ...font, visibility: ready && boxReady ? 'visible' : 'hidden' }}>
      <img id="slideImage" src={scene.boxImage || '../../assets/images/ui/text-box.png'} alt=""
        draggable={false} onLoad={() => setBoxReady(true)} />
      <div className="topLeftText">
        {text(choice ? choice.speaker : line.speaker)}
      </div>
      <div className="text" style={{ whiteSpace: 'pre-line' }}>
        {choice
          ? <button id="button1" onClick={event => activate(event, choice.to)}>
              {text(choice.label)}
            </button>
          : text(line.text)}
      </div>
    </div>
  </>;
}

function mount() {
  const scene = window.storyScene;
  createRoot(document.getElementById('story-player')).render(
    scene.nodes ? <GraphPlayer scene={validateGraph(scene)} /> : <StoryPlayer scene={scene} />
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
