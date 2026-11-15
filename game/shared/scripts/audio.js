// Shared music playback for the menu, map, story and battles.
const storyMusicHandoffKey = 'story-music-handoff';
let storyMusicRestored = false;

// Carry playback only to the next scene requested by the story player. Keeping
// this separate from saved progress avoids resuming music on an unrelated visit.
function preserve_story_music(target)
{
  try {
    sessionStorage.removeItem(storyMusicHandoffKey);
    const audioPlayer = document.getElementById("audioPlayer");
    if (!window.storyScene || !audioPlayer || !Number.isFinite(audioPlayer.currentTime)
        || audioPlayer.currentTime <= 0) return;
    sessionStorage.setItem(storyMusicHandoffKey, JSON.stringify({
      target: new URL(target, window.location.href).href,
      source: audioPlayer.currentSrc || audioPlayer.src,
      time: audioPlayer.currentTime,
    }));
  } catch {
    // Unavailable session storage must not prevent the story from advancing.
  }
}

function restore_story_music(audioPlayer)
{
  if (storyMusicRestored) return;
  storyMusicRestored = true;
  try {
    const saved = sessionStorage.getItem(storyMusicHandoffKey);
    sessionStorage.removeItem(storyMusicHandoffKey);
    const playback = JSON.parse(saved);
    if (!window.storyScene || !playback || playback.target !== window.location.href
        || playback.source !== audioPlayer.src || !Number.isFinite(playback.time)
        || playback.time <= 0) return;
    // Setting currentTime before metadata is ready also sets the initial playback
    // position. Do this before play(), so the beginning never briefly sounds.
    audioPlayer.currentTime = playback.time;
  } catch {
    // Missing/corrupt handoffs fall back to normal playback.
  }
}

function get_music_state()
{
  return GamePreferences.effectiveVolume('music') > 0;
}

function initial_music()
{
  const volume = GamePreferences.effectiveVolume('music') / 100;
  document.querySelectorAll('video[data-music-volume]').forEach(video => {
    video.volume = volume;
    video.muted = volume === 0;
  });
  const audioPlayer = document.getElementById("audioPlayer");
  if (!audioPlayer) return;

  restore_story_music(audioPlayer);

  // Read the preference before starting playback, including after navigation.
  const enabled = get_music_state();
  audioPlayer.volume = volume;
  window.removeEventListener("click", retry_music_after_interaction);
  if (!enabled || audioPlayer.dataset.musicSuspended === 'true')
  {
    audioPlayer.pause();
    return;
  }

  const playback = audioPlayer.play();
  if (playback)
  {
    playback.catch(error => {
      if (error.name === "NotAllowedError") {
        // Autoplay may be blocked on a fresh visit. A later mute must still win.
        if (get_music_state() && audioPlayer.paused) {
          window.addEventListener("click", retry_music_after_interaction, { once: true });
        }
      } else if (error.name !== "AbortError") {
        console.warn("背景音乐播放失败", error);
      }
    });
  }
}

function retry_music_after_interaction()
{
  initial_music();
}

// Pages omit audio autoplay so a stored "off" preference never briefly sounds.
// Some pages load this script in the head, others after the audio element.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initial_music, { once: true });
} else {
  initial_music();
}

window.addEventListener('game-settings-change', initial_music);
