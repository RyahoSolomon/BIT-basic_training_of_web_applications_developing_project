document.addEventListener('DOMContentLoaded', function() {
    const textElement = document.getElementById('text1');
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container'); // 修改为选择image-container
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
	const buttonContainer = document.querySelector('.button-container');
    let currentTextIndex = 0;
	let buttonsShown = false;
    // 1s后text1淡出
    setTimeout(() => {
        textElement.style.opacity = '0';
    }, 1000);

    // 显示下一个文本
    function showNextText() {
        texts[13].style.display = 'none';
        if(currentTextIndex == 13){
            texts[13].style.display = 'block';
        }
        if (currentTextIndex < texts.length) {
            
            if (currentTextIndex > 0) {
                texts[currentTextIndex - 1].style.opacity = '0';
                
            }
			if(currentTextIndex === 4){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[1].style.opacity = '1';
			}
			if(currentTextIndex === 5){
				 topLeftTexts[1].style.opacity = '0';
				 topLeftTexts[0].style.opacity = '1';
			}
			if(currentTextIndex === 6){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[1].style.opacity = '1';
			}
			if(currentTextIndex === 9){
				 topLeftTexts[1].style.opacity = '0';
				 topLeftTexts[0].style.opacity = '1';
			}
			if(currentTextIndex === 10){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[1].style.opacity = '1';
			}
			if(currentTextIndex === 11){
				 topLeftTexts[1].style.opacity = '0';
				 topLeftTexts[0].style.opacity = '1';
			}
			if(currentTextIndex === 12){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[2].style.opacity = '1';
			}
			if(currentTextIndex === 13){
				 topLeftTexts[2].style.opacity = '0';
				 topLeftTexts[0].style.opacity = '1';
			}
            texts[currentTextIndex].style.opacity = '1';
             // 显示当前文本
            
            currentTextIndex++;
        }
		else if (!buttonsShown) {
            buttonContainer.style.display = 'flex'; // 显示按钮
            buttonsShown = true; // 防止按钮重复显示
        }
    }

    // slideImage动画结束后显示文本
    function onSlideImageTransitionEnd() {
        // 显示左上角文本和第一个正文
        topLeftTexts[0].style.opacity = '1';
        texts[0].style.opacity = '1';
        
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function() {
        // text1在1.5秒后消失
        setTimeout(() => {
            textElement.classList.add('hidden'); // 添加消失动画
        }, 1500);

        // text1淡出动画结束后slideImage滑入
        textElement.addEventListener('transitionend', () => {
            slideImage.style.bottom = '1vh';  // 滑入到容器中
        });

        // slideImage滑入动画结束后显示文本
        slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);

        // 修改这里：点击 image-container 切换文本
        imageContainer.addEventListener('click', showNextText);
    });
});
