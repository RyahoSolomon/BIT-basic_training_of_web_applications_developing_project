function get_music_state()
{
  let current_info = localStorage.getItem("current");
  if(current_info == null)
  {
    return true;
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
  if(current_info.is_plot_music_on)
  {
    current_info.is_plot_music_on = false;
  }
  else
  {
    current_info.is_plot_music_on = true;
  }
  localStorage.setItem("current", JSON.stringify(current_info));
  
  let audioPlayer = document.getElementById('audioPlayer');  
  initial_muisc_button_img(current_info.is_plot_music_on);
  if(current_info.is_plot_music_on)
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
    setTimeout(document.getElementById("audioPlayer").pause(), 10);
  }
}