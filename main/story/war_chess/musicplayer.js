let currentMusicIndex = 0;
const audios = document.getElementById('audioPlayer');
const player = document.querySelector('audio');
const op =["../../bgm/war_chess1.mp3","../../bgm/war_chess2.mp3","../../bgm/war_chess3.mp3"];


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
    currentMusicIndex = (currentMusicIndex + 1) % op.length;
    document.getElementById('audioPlayer').src = op[currentMusicIndex];
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
        document.addEventListener('click', toggleAudio);
        player.addEventListener('ended', () => {  
            playNextMusic();  
        });
        var audioPlayer = document.getElementById('audioPlayer');  
        var musicButton = document.querySelector('.button-music');  
        var img = musicButton.querySelector('img');  
    
        let isMuted = 0;
        
        musicButton.addEventListener('click', function(event) {  
            if (isMuted) {  
                img.src = '../../img/unmute.jpg';  
                audioPlayer.play();  
                isMuted = false;  
            } else {  
                img.src = '../../img/mute.jpg';  
                audioPlayer.pause();  
                isMuted = true;  
            }  
        });    
});  