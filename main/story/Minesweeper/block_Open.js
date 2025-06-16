/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2024-09-01 18:46:22
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2024-09-01 20:02:10
 * @FilePath: \Sweep-master-简化版\block_Open.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2024-08-22 17:47:00
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2024-08-24 15:19:17
 * @FilePath: \Sweep-master\block_Open.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 打开方格函数
 * @param x     方格横坐标
 * @param y     方格纵坐标
 */

function block_Open(x, y) {
    let block = ground[x][y];
    block.isOpen = true; // 设置 isOpen 属性表示该方格已被打开
    block.style.background = '#E1E4E6'; // 将背景设置为灰色
    block.style.cursor = 'default'; // 将鼠标样式设置为默认

    // 如果该方格是地雷
    if (block.isMine) {
        block.innerHTML = "<img src='mine.jpg' width='30' height='30'>"; // 显示地雷
        // 遍历所有方格，打开所有地雷
        for (let i = 0; i < row; i++) {
            for (let j = 0; j < col; j++) {
                block = ground[i][j];
                if (!block.isOpen && block.isMine) {
                    block.innerHTML = "<img src='mine.jpg' width='30' height='30'>";
                }
            }
        }
        clearInterval(timer); // 游戏结束，清除计时器
        swal("游戏失败(将在2秒后自动重新开始)");
        setTimeout(() => restart(), 2000);
    } else if (block.count === 0) {
        // 如果计雷数为 0，打开周围的方格
        for (let dx = x - 1; dx <= x + 1; dx++) {
            for (let dy = y - 1; dy <= y + 1; dy++) {
                if (dx >= 0 && dy >= 0 && dx < row && dy < col && !ground[dx][dy].isOpen && !ground[dx][dy].isMine) {
                    block_Open(dx, dy); // 递归打开周围方格
                }
            }
        }
    } else {
        // 如果计雷数不为 0，显示计雷数
        block.innerHTML = block.count;
    }
}
