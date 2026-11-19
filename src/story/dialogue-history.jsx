import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A cursor identifies one presentation, including a fresh visit to a graph node.
export function useDialogueHistory(cursor, speaker, text, caption, isPrompt = false) {
  const entries = useRef([]);
  const lastCursor = useRef(null);
  useLayoutEffect(() => {
    if (cursor == null || cursor === lastCursor.current || !(text || caption)) return;
    lastCursor.current = cursor;
    const previous = entries.current.at(-1);
    // A choice can keep the preceding question on screen.
    if (isPrompt && previous?.speaker === speaker && previous.text === text) return;
    entries.current.push({ speaker, text, caption });
  }, [cursor, speaker, text, caption, isPrompt]);
  return entries;
}

export default function DialogueHistory({ entries, canOpen }) {
  const [snapshot, setSnapshot] = useState(null);
  const dialog = useRef(null);
  const list = useRef(null);
  useLayoutEffect(() => {
    if (!snapshot) return;
    dialog.current.showModal();
    list.current.focus({ preventScroll: true });
    list.current.scrollTop = list.current.scrollHeight;
  }, [snapshot]);

  const controls = document.querySelector('[data-settings-host]');
  if (!controls) return null;
  return <>
    {canOpen && createPortal(
      <button type="button" className="story-history-open" aria-haspopup="dialog"
        onClick={() => {
          if (entries.current.length && !document.body.dataset.storyTransitioning) {
            setSnapshot(entries.current.slice());
          }
        }}>历史记录</button>, controls)}
    {snapshot && createPortal(
      <dialog ref={dialog} className="story-history" aria-labelledby="story-history-title"
        onClose={() => setSnapshot(null)}>
        <header>
          <h2 id="story-history-title">历史记录</h2>
          <button type="button" className="story-history-close" aria-label="关闭历史记录"
            onClick={() => dialog.current.close()} />
        </header>
        <ol ref={list} tabIndex={0} aria-label="本段剧情对白"
          onKeyDown={event => event.stopPropagation()}>
          {snapshot.map(({ speaker, text, caption }, index) => <li key={index}>
            {caption && <p className="story-history-caption">{caption}</p>}
            {text && <><strong>{speaker || '旁白'}</strong><p>{text}</p></>}
          </li>)}
        </ol>
      </dialog>, document.body)}
  </>;
}
