import { useEffect, useLayoutEffect, useRef } from 'react';
import '../../game/story/scripts/advance-input.js';

export function useAdvanceInput(advance) {
  const current = useRef(advance);
  useLayoutEffect(() => { current.current = advance; });
  // Keep one listener and its held-key state while reading the latest committed line.
  useEffect(() => window.StoryAdvanceInput.bind(event => current.current(event)), []);
}
