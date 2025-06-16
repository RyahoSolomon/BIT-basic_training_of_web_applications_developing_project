let currentMusicIndex = 0;
const audios = document.getElementById('audioPlayer');
const player = document.querySelector('audio');


// function initMusicPlayer() {  
//     audios.forEach((audio, index) => {   
//         audio.addEventListener('ended', () => {  
//             playNextMusic();  
//         });  

//         audio.removeAttribute('autoplay');  

//         if (index === currentMusicIndex) {  
//             audio.play();  
//         }  
//     });  
// }  
  
function playNextMusic() {  
    currentMusicIndex = (currentMusicIndex + 1) % music_library.length;
    document.getElementById('audioPlayer').src = music_library[currentMusicIndex];
    audios.play();  
}  

// window.onload = function(){
    
// };

function toggleAudio() {  
    var audio = document.getElementById('audioPlayer');  
    var musicButton = document.querySelector('.button-music');  
    var img = musicButton.querySelector('img');
    img.src = '../../img/unmute.jpg';  
    audio.play(); 
    this.removeEventListener('click', toggleAudio);
}  
    
    document.addEventListener('DOMContentLoaded', function() {
        player.addEventListener('ended', () => {  
            playNextMusic();  
        });
        var audioPlayer = document.getElementById('audioPlayer');  
        var musicButton = document.getElementById('switch_music_state_mask');  
        let img = document.getElementById("switch_music_state");  
    
        musicButton.addEventListener('click', function(event) {  
            if (current_info.is_inwar_music_on) {  
                img.src = 'assets/UI/music_on.png';  
                audioPlayer.play();  
                isMuted = false;  
            } else {  
                img.src = 'assets/UI/music_off.png';  
                audioPlayer.pause();  
                isMuted = true;  
            }  
        });    
});  

function switch_music_state()
{
  if(current_info.is_inwar_music_on == false)
  {
    current_info.is_inwar_music_on = true;
    localStorage.setItem("current", JSON.stringify(current_info));
    document.getElementById("switch_music_state_mask").title = "关闭音乐";
  }
  else
  {
    current_info.is_inwar_music_on = false;
    localStorage.setItem("current", JSON.stringify(current_info));
    document.getElementById("switch_music_state_mask").title = "开启音乐";
  }
}