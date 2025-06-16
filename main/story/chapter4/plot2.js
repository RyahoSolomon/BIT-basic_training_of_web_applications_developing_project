document.addEventListener('DOMContentLoaded', function () {
    const textElement = document.getElementById('text1');
    const slideImage = document.getElementById('slideImage');
    const imageContainer = document.querySelector('.image-container');
    const texts = document.querySelectorAll('.text');
    const topLeftTexts = document.querySelectorAll('.topLeftText');
    const buttonContainer = document.querySelector('.button-container');
    const text2Element = document.getElementById('text2'); // 获取 text2 元素
    let currentTextIndex = 0;
    // 1s后text1淡出
    setTimeout(() => {
        textElement.style.opacity = 0;
    }, 1000);

    // 显示下一个文本
    function showNextText() {
        if (currentTextIndex < texts.length) {
            if (currentTextIndex > 0) {
                texts[currentTextIndex - 1].style.opacity = '0'; // 隐藏上一个文本
            }
            if (currentTextIndex === 1) {
                topLeftTexts[0].style.opacity = '0';
                topLeftTexts[1].style.opacity = '1';
            }
            texts[currentTextIndex].style.opacity = '1'; // 显示当前文本
            currentTextIndex++;
        }
    }

    // slideImage动画结束后显示文本
    function onSlideImageTransitionEnd() {
        topLeftTexts[0].style.opacity = '1'; // 显示左上角文本和第一个正文
        texts[0].style.opacity = '1';
        slideImage.removeEventListener('transitionend', onSlideImageTransitionEnd);
    }

    // 页面加载后动画顺序控制
    window.addEventListener('load', function () {
        // text1在1.5秒后消失
        setTimeout(() => {
            textElement.classList.add('hidden'); // 添加消失动画
        }, 1000);

        // text1淡出动画结束后slideImage滑入
        textElement.addEventListener('transitionend', () => {
            slideImage.style.bottom = '1vh'; // 滑入到容器中z
        });

		 slideImage.addEventListener('transitionend', onSlideImageTransitionEnd);

        // 点击 image-container 切换文本或触发最后的场景
        imageContainer.addEventListener('click', () => {
            if (currentTextIndex < texts.length) {
                showNextText();
            } else {
                // 最后一次点击时触发隐藏动画和显示 text2
                slideImage.style.opacity = '0'; // 隐藏 slideImage
                document.body.style.backgroundColor = 'black'; // 背景变为黑色
                document.body.style.backgroundImage = 'none'; // 移除背景图
                text2Element.style.opacity = '1'; // 显示 text2

                // 等待动画完成后再跳转
                setTimeout(() => {
                    window.location.href = '../war_chess/war_chess.html'; 
                }, 3000); 
            }
        });
    });
});
