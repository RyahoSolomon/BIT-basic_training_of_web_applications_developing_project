function Shutoff(){
    var achievement_popup = document.getElementById("achievement_popup");
    achievement_popup.style.display = "none";
}
function ReturnTo(){
    window.location.href = "../map/map.html";
}
function block_click(i, j, e) {
    // 如果方格已打开，直接返回
    if (ground[i][j].isOpen) {
        return;
    }

    // 鼠标左键，用于打开方格
    if (e.button === 0) {
        // 判断是否第一次点击
        if (isFirstOpen) {
            isFirstOpen = false; // 如果是第一次点击，将标志设置为 false
            let count = 0; // 初始化当前地雷数为 0




    /* 这里可以添加触发“左上角...”成就的逻辑 */
    // 如果首次点击左上角 (0, 0)，有概率生成地雷并立即结束游戏
    if (i === 0 && j === 0) {
        if (Math.random() < 0.5) { // 假设 50% 概率生成地雷
            ground[0][0].isMine = true;
            block_Open(0, 0);
            var username = window.localStorage.username;
            var achievement = window.localStorage.getItem(username + 'achievement');
            achievement = JSON.parse(achievement);
            if(achievement['ach5'] == 0){
                var achievement_popup = document.getElementById("achievement_popup");
                achievement_popup.style.display = "flex";
            }
            achievement['ach5'] = 1;
            localStorage.setItem(username + 'achievement',JSON.stringify(achievement));
            return; // 游戏结束，不再继续
        }
    }



            // 生成 maxCount 个地雷
            while (count < maxCount) {
                let x = Math.floor(Math.random() * row); // 生成随机的横坐标
                let y = Math.floor(Math.random() * col); // 生成随机的纵坐标

                // 允许左上角 (0, 0) 可能为地雷，但其余情况按规则生成
                if (i === 0 && j === 0) {
                    // 允许左上角放置地雷，但确保周围无地雷
                    if (!ground[x][y].isMine && (x !== 0 || y !== 0) && (x < 2 && y < 2)) {
                        continue; // 跳过左上角九宫格区域
                    }

                    if (!ground[x][y].isMine) {
                        ground[x][y].isMine = true; // 自定义属性 isMine 代表方格是地雷
                        count++; // 当前地雷数加一

                        // 更新周围方格的计雷数
                        for (let dx = x - 1; dx <= x + 1; dx++) {
                            for (let dy = y - 1; dy <= y + 1; dy++) {
                                // 防止数组越界
                                if (dx >= 0 && dy >= 0 && dx < row && dy < col) {
                                    ground[dx][dy].count++;
                                }
                            }
                        }
                    }
                } else {
                    // 如果第一次点击不是左上角，确保左上角 (0, 0) 无地雷，且首次点击九宫格周围无地雷
                    if (!(x === 0 && y === 0) && !ground[x][y].isMine && Math.abs(x - i) > 1 && Math.abs(y - j) > 1) {
                        ground[x][y].isMine = true; // 自定义属性 isMine 代表方格是地雷
                        count++; // 当前地雷数加一

                        // 更新周围方格的计雷数
                        for (let dx = x - 1; dx <= x + 1; dx++) {
                            for (let dy = y - 1; dy <= y + 1; dy++) {
                                // 防止数组越界
                                if (dx >= 0 && dy >= 0 && dx < row && dy < col) {
                                    ground[dx][dy].count++;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 执行打开方格的操作
        block_Open(i, j);
    }
    // 鼠标右键，用于标记方格
    else if (e.button === 2) {
        let block = ground[i][j];
        if (block.innerHTML !== "🚩") {
            block.innerHTML = "🚩";
        } else {
            block.innerHTML = '';
        }
    }

    // 判断是否胜利
    let isWin = true;
    count.innerHTML = maxCount; // 重置剩余地雷数
    for (let x = 0; x < row; x++) {
        for (let y = 0; y < col; y++) {
            let block = ground[x][y];
            // 更新剩余地雷数
            if (block.innerHTML === "🚩") {
                count.innerHTML = parseInt(count.innerHTML) - 1;
            }
            // 判断游戏胜利条件 (所有的非雷方格已打开)
            if (!block.isMine && !block.isOpen) {
                isWin = false;
            }
        }
    }
    if (isWin) {
        clearInterval(timer); // 游戏胜利，清除计时器
        swal("游戏胜利");
        setTimeout(ReturnTo,1000);
    }
}
