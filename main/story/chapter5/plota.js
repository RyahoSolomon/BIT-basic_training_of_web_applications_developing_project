document.addEventListener('DOMContentLoaded', function () {
    const textElement = document.getElementById('text1');
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container');
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
    const buttonContainer = document.querySelector('.button-container');
    const text2 = document.querySelectorAll('.centered-text1');
    let currentTextIndex = 0;
    let buttonsShown = false;

    // 1s后text1淡出
    setTimeout(() => {
        textElement.style.opacity = 0;
    }, 1000);

    // 显示下一个文本
    function showNextText() {

        if (currentTextIndex === 0) {
            topLeftTexts[0].style.opacity = '1';
			texts[0].style.opacity = '1';
        } else if (currentTextIndex === 1) {
            topLeftTexts[0].style.opacity = '0';
			texts[0].style.opacity = '0';
			topLeftTexts[1].style.opacity = '1';
			texts[1].style.opacity = '1';
        } else if (currentTextIndex === 2) {
            topLeftTexts[1].style.opacity = '0';
			texts[1].style.opacity = '0';
			topLeftTexts[0].style.opacity = '1';
			texts[2].style.opacity = '1';
        } else if (currentTextIndex === 3) {
            text2[0].style.opacity = '1';
        } else if (currentTextIndex === 4) {
            text2[0].style.opacity = '0';
            topLeftTexts[0].style.opacity = '0';
			texts[2].style.opacity = '0';
			topLeftTexts[2].style.opacity = '1';
			texts[3].style.opacity = '1';
        } else if (currentTextIndex === 5) {
            text2[1].style.opacity = '1';
  
        } else if (currentTextIndex === 6) {
            text2[1].style.opacity = '0';
			texts[3].style.opacity = '0';
			texts[4].style.opacity = '1';
        } else if (currentTextIndex === 7) {
            text2[2].style.opacity = '1';
        } else if (currentTextIndex === 8) {
            text2[2].style.opacity = '0';
			texts[4].style.opacity = '0';
			texts[5].style.opacity = '1';
			topLeftTexts[2].style.opacity = '0';
			topLeftTexts[0].style.opacity = '1';
        } else if (currentTextIndex === 9) {
            texts[5].style.opacity = '0';
			texts[6].style.opacity = '1';
			topLeftTexts[0].style.opacity = '0';
			topLeftTexts[3].style.opacity = '1';
        } else if (currentTextIndex === 10) {
            texts[6].style.opacity = '0';
			texts[7].style.opacity = '1';
        } else if (currentTextIndex === 11) {
           texts[7].style.opacity = '0';
			texts[8].style.opacity = '1';
        } else if (currentTextIndex === 12) {
           texts[8].style.opacity = '0';
			texts[9].style.opacity = '1';
        } else {
            window.location.href = "./he.html";
        }

        currentTextIndex++;

    }

    // slideImage动画结束后显示文本
    function onSlideImageTransitionEnd() {
        // 显示左上角文本和第一个正文
		topLeftTexts[0].style.opacity = '1';
		texts[0].style.opacity = '1';
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function () {
        // text1在1.5秒后消失
        setTimeout(() => {
            textElement.classList.add('hidden'); // 添加消失动画
        }, 1500);

        // text1淡出动画结束后slideImage滑入
        textElement.addEventListener('transitionend', () => {
            slideImage.style.bottom = '1vh'; // 滑入到容器中
        });

        // slideImage滑入动画结束后显示文本
        slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);

        // 修改这里：点击 image-container 切换文本
        imageContainer.addEventListener('click', showNextText);
    });
});
