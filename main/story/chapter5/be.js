document.addEventListener('DOMContentLoaded', function() {
    
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container'); // 修改为选择image-container
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
	const buttonContainer = document.querySelector('.button-container');
    let currentTextIndex = 0;
	let buttonsShown = false;
    // 1s后text1淡出
    setTimeout(() => {
        textElement.style.opacity = 0;
    }, 1000);

    // 显示下一个文本
    function showNextText() {
        if(currentTextIndex == 9){
            var username = window.localStorage.username;
            texts[currentTextIndex].textContent = "盘古觉醒 3 个月后," + username + "、鸢阑、叶岱在保卫人族皇城的战斗中,为数千怪物围攻而陨落."
        }
        if(currentTextIndex == texts.length){
            window.location.href = "../map/map.html";
        }
        if (currentTextIndex < texts.length) {
            if (currentTextIndex > 0) {
                texts[currentTextIndex - 1].style.opacity = '0'; // 隐藏上一个文本
            }
			if(currentTextIndex === 0){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[1].style.opacity = '1';
			}
			if(currentTextIndex === 1){
				 topLeftTexts[1].style.opacity = '0';
				 topLeftTexts[0].style.opacity = '1';
			}
			if(currentTextIndex === 2){
				 topLeftTexts[0].style.opacity = '0';
				 topLeftTexts[1].style.opacity = '1';
			}
            if(currentTextIndex === 3){
                topLeftTexts[1].style.opacity = '0';
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
        // 显示左上角文本和第一个正文
        topLeftTexts[0].style.opacity = '1';
        texts[0].style.opacity = '1';
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function() {
       
            slideImage.style.bottom = '1vh';  
        

        // slideImage滑入动画结束后显示文本
        slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);

        // 修改这里：点击 image-container 切换文本
        imageContainer.addEventListener('click', showNextText);
    });
});
