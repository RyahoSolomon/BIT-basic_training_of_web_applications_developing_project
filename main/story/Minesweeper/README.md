<!--
 * @Author: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @Date: 2024-08-22 17:47:00
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2024-08-24 14:04:04
 * @FilePath: \Sweep-master\README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->


# Sweep

js + html + css 实现一个简单的扫雷游戏~~ 附加 难度选择 计时 计雷数 开始 重新开始 功能

![图片](https://img-blog.csdnimg.cn/20200623131545659.gif)

# 用户手册

* 上方有两个按钮 **Start 和 Restart** 分别用来开始游戏和刷新页面重新开始
* 按钮的右侧是一个下拉框用于选择难度模式，分别有 **Easy 、Medium 、Hard** 三种模式，分别对应了 **6 * 6、10 * 10、15 * 15** 的区域大小，其中分别包含 **6、10、15**个雷~
* 上方左侧有两个标签 span 标签 **Mine 和 Time** 分别用来表示剩余的雷数 和 已用时间

#  实现过程

首先，该程序由几个模块组成，各功能如图所示:

![图片](https://img-blog.csdnimg.cn/20200623132827283.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3FxXzQ1MTczNDA0,size_16,color_FFFFFF,t_70)

> 其中的 customize_Alert 的 js 和 css 是我在网上找的一个蛮好看的 alert 美化代码，直接在 html 主体 Sweep.html 中引入即可，然后将所有的 alert 换成 swal 即可！
>
> 这里给大家放上这个alert美化的链接 [https://blog.csdn.net/windy1001/article/details/82685977](https://blog.csdn.net/windy1001/article/details/82685977)

##  1. html主体Sweep.html

其中的<head></head>部分就引入了我们前面所述的几个模块

在<body></body>部分定义了两个 span 标签用来计时和计雷数，一个 button 用来开始游戏绑定了 start() 函数，另一个按钮用来重新开始游戏绑定了 restart() 函数，然后还有一个下拉框用来选择三种难度

在<script></script>部分首先定义了几个常量，然后是 start() 函数的定义，其中是一个 switch 语句，读取下拉框选中的值，对应不同的难度，进行不同的初始化。最后就是 restart() 函数，用来刷新页面。

## 2. 最重要的三个函数

### initial_Ground.js

这个函数用于初始化，将场地转换为一个二维数组ground返回

### block_Click.js

这个函数用于处理点击方格事件，函数的形参分别代表方格对应二维数组的横坐标和纵坐标以及鼠标事件
其中分为三种情况：

* 如果方格已经打开，则直接退出
* 点击了鼠标左键，且方格没有打开，判断是不是第一次打开，如果是的话，则随机生成对应的雷数，并用接下来要讲的的block_open打开方格
* 点击了鼠标右键，如果该方格不是红旗，则将该方格内容置为红旗，如果是红旗，则将该方格内容置为空
* 最后遍历整个二维数组，根据对应的红旗数减去对应的剩余雷数，并且判断游戏是否结束，如果结束了则停止计时

###  block_Open.js

这个函数用来打开方格，形参为方格对应二维数组ground的坐标其中分了三种情况讨论

* 如果打开的方格是雷，则显示雷的图片，并且遍历整个二维数组找到所有的雷并显示，并停止计时，输出游戏结束
* 如果打开的方格周围雷数为0，则遍历该方格周围一圈的8个方格，递归调用block_Open函数，打开所有雷数为0的方格
* 如果打开的方格周围雷数不为0，则显示该方格周围的雷数
