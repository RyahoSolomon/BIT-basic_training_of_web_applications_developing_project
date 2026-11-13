// Shared by the landing page, menu and story pages at any directory depth.
let menuMusicEnabled = true;

function get_music_state()
{
  let current_info = localStorage.getItem("current");
  if(current_info == null)
  {
    return menuMusicEnabled;
  }
  current_info = JSON.parse(current_info);
  if(current_info.is_plot_music_on == false)
  {
    return false;
  }
  else 
  {
    return true;
  }
}

function switch_music_state()
{
  let current_info = localStorage.getItem("current");
  current_info = JSON.parse(current_info);
  const enabled = !get_music_state();
  menuMusicEnabled = enabled;
  if (current_info) {
    current_info.is_plot_music_on = enabled;
    localStorage.setItem("current", JSON.stringify(current_info));
  }
  
  initial_music();
}

function initial_muisc_button_img(enabled = get_music_state())
{
  const img = document.querySelector('.button-music img');
  img.src = new URL(enabled ? 'unmute.jpg' : 'mute.jpg', img.src).href;
}

function initial_music()
{
  const audioPlayer = document.getElementById("audioPlayer");
  if (!audioPlayer) return;

  // Read the preference before starting playback, including after navigation.
  const enabled = get_music_state();
  initial_muisc_button_img(enabled);
  window.removeEventListener("click", retry_music_after_interaction);
  if (!enabled)
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
