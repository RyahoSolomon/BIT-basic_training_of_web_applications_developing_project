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
  let musicButton = document.querySelector('.button-music');  
  let img = musicButton.querySelector('img');  
  if(current_info.is_plot_music_on)
  {
    audioPlayer.play();
    img.src = "main/img/unmute.jpg";
  }
  else
  {
    audioPlayer.pause();
    img.src = "main/img/mute.jpg";
  }
}

function initial_muisc_button_img()
{
  if(get_music_state())
  {
    document.querySelector('.button-music').querySelector('img').src = 'main/img/unmute.jpg';
  }
  else
  {
    document.querySelector('.button-music').querySelector('img').src = 'main/img/mute.jpg';
  }
}

function initial_music()
{
  if(get_music_state())
  {
    document.getElementById("audioPlayer").play();
  }
}