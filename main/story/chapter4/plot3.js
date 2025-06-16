document.addEventListener('DOMContentLoaded', function() {
    const textElement = document.getElementById('text1');
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container');
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
    const buttonContainer = document.querySelector('.button-container');
	let currentTextIndex=0;
    let current_info = localStorage.getItem("current");
    try {
        current_info = JSON.parse(current_info);
    } catch (error) {
        console.error("Failed to parse current_info:", error);
        current_info = {hidden_clue_poison: false}; // 设定一个默认值，避免后续错误
    }

    // 1s后text1淡出
    setTimeout(() => {
        textElement.style.opacity = 0;
    }, 1000);

    // 显示下一个文本
    function showNextText() {
    if (currentTextIndex === 0) {
        // 显示第一条文本
        texts[0].style.opacity = '1';
        currentTextIndex++;
    } else if (currentTextIndex === 1) {
        // 显示第二条文本，并隐藏第一条文本
        texts[1].style.opacity = '1';
        texts[0].style.opacity = '0';
		topLeftTexts[2].style.opacity = '0';
		topLeftTexts[1].style.opacity = '1';
        currentTextIndex++;
    } else if (current_info?.hidden_clue_poison && currentTextIndex === 2) {
        // 显示第三条文本，并结束
        texts[2].style.opacity = '1';
	    texts[1].style.opacity = '0';
		topLeftTexts[1].style.opacity = '0';
		topLeftTexts[0].style.opacity = '1';
        currentTextIndex++;
    } else if (!current_info?.hidden_clue_poison && currentTextIndex === 2) {
        // 跳过第三条文本，直接增加 currentTextIndex，继续显示后面的文本
	    texts[1].style.opacity = '0';
		topLeftTexts[1].style.opacity = '0';
		topLeftTexts[0].style.opacity = '1';
        currentTextIndex++;
        showNextText(); // 递归调用以继续下一个文本的显示
    } else if (!current_info?.hidden_clue_poison && currentTextIndex > 2 && currentTextIndex < 9) {
        // 显示第4到第9条文本
        texts[currentTextIndex].style.opacity = '1';
		texts[currentTextIndex-1].style.opacity = '0';
		if(currentTextIndex === 6){
			topLeftTexts[0].style.opacity = '0';
			topLeftTexts[1].style.opacity = '1';   
		}
		if(currentTextIndex === 7){
			topLeftTexts[1].style.opacity = '0';
			topLeftTexts[0].style.opacity = '1';   
		}
        currentTextIndex++;
    }else{
        window.location.href = '../Minesweeper/Sweep.html'
    }
}


    // slideImage动画结束后显示文本
    function onSlideImageTransitionEnd() {
        topLeftTexts[2].style.opacity = '1';
        texts[0].style.opacity = '1';
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function() {
        // text1在1.5秒后消失
        setTimeout(() => {
            textElement.classList.add('hidden');
        }, 1500);

        // text1淡出动画结束后slideImage滑入
        textElement.addEventListener('transitionend', () => {
            slideImage.style.bottom = '1vh';
        });

        // slideImage滑入动画结束后显示文本
        slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);

        // 点击 image-container 切换文本
        imageContainer.addEventListener('click', showNextText);
    });
});
