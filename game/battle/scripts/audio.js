// The shared audio controller applies the same volume and autoplay policy as story pages.
let currentMusicIndex = 0;
function playNextMusic() {
    currentMusicIndex = (currentMusicIndex + 1) % music_library.length;
    document.getElementById('audioPlayer').src = music_library[currentMusicIndex];
    initial_music();
}
document.getElementById('audioPlayer').addEventListener('ended', playNextMusic);
