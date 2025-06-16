document.addEventListener('DOMContentLoaded', function() {
    const textElement = document.getElementById('text1');
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container');
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
    const buttonContainer = document.querySelector('.button-container');
    let currentTextIndex = 0;
	let buttonsShown = false;
    // 显示下一个文本
    function showNextText() {
        if (currentTextIndex < texts.length) {
            if (currentTextIndex > 0) {
                texts[currentTextIndex - 1].style.opacity = '0'; // 隐藏上一个文本
            }
			if(currentTextIndex === 1){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[1].style.opacity = '1';
			}
			if(currentTextIndex === 3){
				 topLeftTexts[1].style.opacity = '0';
				 topLeftTexts[2].style.opacity = '1';
			}
			if(currentTextIndex === 4){
				 topLeftTexts[2].style.opacity = '0';
				 topLeftTexts[3].style.opacity = '1';
			}
			if(currentTextIndex === 5){
				 topLeftTexts[3].style.opacity = '0';
				 topLeftTexts[2].style.opacity = '1';
			}
            if (currentTextIndex === texts.length - 1){
                var username = localStorage.username;
                texts[currentTextIndex].textContent = username + ",你怎么看?";
            }
            texts[currentTextIndex].style.opacity = '1'; // 显示当前文本
            currentTextIndex++;
        }
		else if (!buttonsShown) {
            buttonContainer.style.display = 'flex'; // 显示按钮
            buttonsShown = true; // 防止按钮重复显示
        }
    }

    // slideImage动画结束后显示文本
    function onSlideImageTransitionEnd() {
        topLeftTexts[0].style.opacity = '1';
        texts[0].style.opacity = '1';
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function() {
        // 直接显示 slideImage，没有与 text1 的动画关联
        slideImage.style.bottom = '1vh';  // 滑入到容器中

        // slideImage滑入动画结束后显示文本
        slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);

        // 点击 image-container 切换文本
        imageContainer.addEventListener('click', showNextText);
    });
});
