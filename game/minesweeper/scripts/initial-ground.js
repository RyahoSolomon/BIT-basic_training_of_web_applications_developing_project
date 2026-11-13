/*
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2024-09-01 18:46:22
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2024-09-01 19:53:30
 * @FilePath: \Sweep-master-简化版\initial_Ground.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 初始化矩阵
 */

function initial_ground() {
    let groundHtml = '';
    for (let i = 0; i < row; i++) {
        groundHtml += '<tr>'; // 行标签
        for (let j = 0; j < col; j++) {
            // 列标签，每个列标签中包含一个 span 标签，表示方格
            groundHtml +=
                '<td><span class="blocks" onmousedown="block_click(' + i + ',' + j + ',event)"></span></td>';
        }
        groundHtml += '</tr>';
    }
    // 写入 body 中定义的 table 标签中
    document.getElementById('ground').innerHTML = groundHtml;
    
    // 得到 span 标签的一维数组
    let span_Blocks = document.getElementsByClassName('blocks');
    
    // 将一维数组转换为二维数组
    let ground = [];
    for (let i = 0; i < span_Blocks.length; i++) {
        if (i % col === 0) {
            // 每一行创建一个一维数组
            ground.push([]);
        }
        span_Blocks[i].count = 0; // 给每个方格定义一个 count 属性，记录四周九宫格内雷的数量，均初始化为 0
        ground[Math.floor(i / col)].push(span_Blocks[i]); // 向二维数组添加 span 标签方格，每个方格包含 count 属性
    }
    return ground; // 返回二维数组
}




