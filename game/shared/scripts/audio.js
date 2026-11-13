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
  
  let audioPlayer = document.getElementById('audioPlayer');  
  initial_muisc_button_img(enabled);
  if(enabled)
  {
    audioPlayer.play();
  }
  else
  {
    audioPlayer.pause();
  }
}

function initial_muisc_button_img(enabled = get_music_state())
{
  const img = document.querySelector('.button-music img');
  img.src = new URL(enabled ? 'unmute.jpg' : 'mute.jpg', img.src).href;
}

function initial_music()
{
  if(get_music_state())
  {
    document.getElementById("audioPlayer").play();
  }
  else
  {
    document.getElementById("audioPlayer").pause();
  }
}
