import React from 'react';
import { createPortal } from 'react-dom';

export default function SkipButton({ label = '跳过剧情', onClick }) {
  const controls = document.querySelector('[data-settings-host]');
  if (!controls) return null;
  return createPortal(
    <button type="button" data-story-skip aria-label={label} onClick={onClick}>
      <img src="../../assets/images/skip_dialogue.png" alt="" draggable={false} />
      <span className="story-skip-hint" aria-hidden="true">{label}</span>
    </button>, controls);
}
