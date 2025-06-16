document.addEventListener('DOMContentLoaded', function() {
    const text2 = document.getElementById('text2');
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container');
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
    const buttonContainer = document.querySelector('.button-container');
    let currentTextIndex = 0;
    let buttonsShown = false;

    // text2 1秒后淡出
    setTimeout(() => {
        text2.style.opacity = 0;
        // text2消失后触发背景和slideImage动画
        setTimeout(() => {
            document.body.style.backgroundImage = "url('../../img/background/021_rest.png')"; // 替换为您的背景图片
            slideImage.style.bottom = '1vh';  // 开始slideImage动画
        }, 1000);
    }, 1000);

    // slideImage动画结束后显示文本
    function onSlideImageTransitionEnd() {
        topLeftTexts[1].style.opacity = '1'; // 显示左上角文本
        texts[0].style.opacity = '1'; // 显示第一个正文
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 显示下一个文本
    function showNextText() {
        if (currentTextIndex === texts.length) {
            window.location.href = "plot2.html";
        }
        if (currentTextIndex < texts.length) {
            if (currentTextIndex > 0) {
                texts[currentTextIndex - 1].style.opacity = '0'; // 隐藏上一个文本
            }
			if(currentTextIndex ===1){
				 topLeftTexts[1].style.opacity = '0'; 
				 topLeftTexts[2].style.opacity = '1'; 
			}
			if(currentTextIndex ===3){
				 topLeftTexts[2].style.opacity = '0'; 
				 topLeftTexts[0].style.opacity = '1'; 
			}
			if(currentTextIndex ===5){
				 topLeftTexts[0].style.opacity = '0'; 
				 topLeftTexts[2].style.opacity = '1'; 
			}
            texts[currentTextIndex].style.opacity = '1'; // 显示当前文本
            currentTextIndex++;
        } else if (!buttonsShown) {
            buttonContainer.style.display = 'flex'; // 显示按钮
            buttonsShown = true; // 防止按钮重复显示
        }
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function() {
        slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);
        imageContainer.addEventListener('click', showNextText);
    });
});
