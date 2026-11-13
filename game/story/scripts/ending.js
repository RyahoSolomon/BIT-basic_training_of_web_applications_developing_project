document.addEventListener("DOMContentLoaded", function() {
    const texts = document.querySelectorAll(".text");
    let delay = 0;
    
    texts.forEach((text, index) => {
        setTimeout(() => {
            text.style.opacity = "1";
            text.style.transform = "translateY(0)";
        }, delay);
        delay += 3000; // (毫秒) Adjust delay time to control the timing of text appearance
    });

    
});
