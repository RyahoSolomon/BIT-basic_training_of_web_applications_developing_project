import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

function navigate(target) {
  if (typeof target === 'function') target();
  else if (target) window.location.href = target;
}

function StoryPlayer({ scene }) {
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [boxReady, setBoxReady] = useState(false);
  const leaving = useRef(false);
  const player = localStorage.getItem('username') || '';
  const text = value => (value || '').replaceAll('{player}', player);

  useEffect(() => {
    const introduction = document.querySelector(scene.intro?.selector || '#text1');
    const timer = setTimeout(() => {
      if (introduction) introduction.hidden = true;
      if (scene.intro?.background) {
        document.body.style.backgroundImage = 'url("' + scene.intro.background + '")';
      }
      setReady(true);
    }, introduction ? 2000 : 0);
    return () => clearTimeout(timer);
  }, [scene]);

  function leave(target, before) {
    if (leaving.current) return;
    leaving.current = true;
    before?.();
    navigate(target);
  }

  useEffect(() => {
    const button = document.querySelector('.button-save');
    const skip = () => leave(scene.skip);
    if (scene.skip) button?.addEventListener('click', skip);
    return () => button?.removeEventListener('click', skip);
  }, [scene]);

  function advance(event) {
    if (!ready || !boxReady || finished || leaving.current || event.detail > 1) return;
    if (index + 1 < scene.lines.length) {
      setIndex(index + 1);
    } else {
      setFinished(true);
      if (!scene.choices && !scene.inlineChoice) leave(scene.next);
    }
  }

  function activate(event, target, before) {
    event.stopPropagation();
    leave(target, before);
  }

  const line = scene.lines[index] || {};
  const choice = finished ? scene.inlineChoice : null;
  const font = { '--story-font-family': (choice || line).fontFamily || scene.fontFamily };
  return <>
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
          ? <button id="button1" onClick={event => activate(event, choice.to, choice.before)}>
              {text(choice.label)}
            </button>
          : text(line.text)}
      </div>
    </div>
    {ready && finished && scene.choices &&
      <div className="button-container" style={{ display: 'flex' }}>
        {scene.choices.map((option, optionIndex) =>
          <button key={optionIndex} className="button" type="button"
            style={{ border: 0, padding: 0, backgroundColor: 'transparent',
              '--story-font-family': option.fontFamily || scene.fontFamily }}
            onClick={event => activate(event, option.to, option.before)}>
            <span className="button-text">{text(option.label)}</span>
          </button>)}
      </div>}
  </>;
}

function mount() {
  createRoot(document.getElementById('story-player')).render(
    <StoryPlayer scene={window.storyScene} />
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true });
} else {
  mount();
}
