//每一个页面的数据保存在同文件夹下 op.js 的op对象里

var count = op.steps;//总点击次数
var pagename = op.nextpage;
var page_type = op.type;//场景类型：0为自动跳转，1为分支选择，2为结局决定
var click = 0;//当前点击次数


//跳转指定页面
function goto(apage) {
    $("body").fadeOut(100, function () { window.location.replace(apage); })
};


function bgmchange(){
    var nowbgm = op.bgm[click];
    if(nowbgm != window.localStorage.nowbgm && nowbgm != "none"){
        window.localStorage.nowbgm = nowbgm;
    }
}

function skip(){
    click = op.steps-1;
    document.getElementById('skip').classList.toggle('active');
    var moveElement = document.getElementById('move'); // 获取具有id="move"的元素
    if (moveElement) {
        moveElement.click(); // 模拟点击该元素
    }
}

//当前时间获取
function getCurrentDateTime() {
    var currentDate = new Date();
    
    var year = currentDate.getFullYear();
    var month = (currentDate.getMonth() + 1).toString().padStart(2, '0'); // 月份从0开始，需要加1并补零
    var day = currentDate.getDate().toString().padStart(2, '0');
    var hours = currentDate.getHours().toString().padStart(2, '0');
    var minutes = currentDate.getMinutes().toString().padStart(2, '0');
    
    var dateTimeString = year + '/' + month + '/'  + day + ' ' + hours + ':' + minutes;
    
    return dateTimeString;
  }

//保存函数
function Save (situation){
    var username = window.localStorage.username;
    var saveurl = document.referrer;
    var currentDateTime = getCurrentDateTime();
    var level1 = window.localStorage.getItem('level1');
    var level2 = window.localStorage.getItem('level2');
    var level3 = window.localStorage.getItem('level3');
    var level4 = window.localStorage.getItem('level4');
    var level5 = window.localStorage.getItem('level5');
    var level6 = window.localStorage.getItem('level6');
    var MSYgamename = window.localStorage.MSYgamename;//获取当前章节信息
    var current = window.localStorage.getItem('current');
    // var array = window.localStorage.getItem(savearea);
    console.debug(localStorage.getItem(username + 'savearea'));
    var array = JSON.parse(localStorage.getItem(username + 'savearea')) || [];  
// 定义要添加到数组中的对象  
    var opt = {  
        saveurl: saveurl, 
        currentDateTime: currentDateTime,  
        level1: level1,
        level2: level2,
        level3: level3,
        level4: level4,
        level5: level5,
        level6: level6,  
        MSYgamename: MSYgamename,
        current:current,
    };  
    var temp = {
        saveurl: 0, 
        currentDateTime: 0,  
        level1: 0,
        level2: 0,
        level3: 0,
        level4: 0,
        level5: 0,
        level6: 0,  
        MSYgamename: 0, 
        current: 0, 
    };
    // opt = JSON.stringify(opt);
    // temp = JSON.stringify(temp);
    if(array){

    }else{
        for(let i=0;i<10;++i){
            array.push(temp);
        }
    }
    array[situation] = opt;  

    localStorage.setItem(username + 'savearea', JSON.stringify(array));  
    console.debug(localStorage.getItem(username + 'savearea'));
    
    document.getElementById('gamename'+situation).textContent = MSYgamename;
    document.getElementById('time'+situation).textContent = currentDateTime;

    alert("保存成功");
}

function Load(situation) {
    var username = window.localStorage.username;
    var array = JSON.parse(localStorage.getItem(username+'savearea')) || [];
    if(array[situation]){
        var opt = array[situation];
        
        window.localStorage.keyvalue = opt.keyvalue;
        window.localStorage.level1 = opt.level1;
        window.localStorage.level2 = opt.level2;
        window.localStorage.level3 = opt.level3;
        window.localStorage.level4 = opt.level4;
        window.localStorage.level5 = opt.level5;
        window.localStorage.level6 = opt.level6;
        window.localStorage.MSYgamename = opt.MSYgamename;
        window.localStorage.current = opt.current;
        window.location.href = "story/map/map.html";
    }else{
        alert("找不到游戏地址");
    }
}

//返回主页
function Return() {
    window.location.href ="../../main/main.html";
}

//页面转跳函数
function redirectToNewPage(nextpage) {
    // 在上一页中跳转到下一页时传递上一页的 URL
    var nextPageURL = nextpage + "?referrer=" + encodeURIComponent(window.location.href);
    window.location.href = nextPageURL;
}

function raise_flag(state){
    var index = window.localStorage.userid;
    if (index == -1 || index == undefined) {
        alert("未能确定当前用户状态，加载失败");
        return;
    }

    var array = JSON.parse(window.localStorage.userArr);
    array[index].MSYflag[state] = 1;
    window.localStorage.userArr = JSON.stringify(array);
}

//auto功能实现
var autoClickInterval; // 保存定时器的引用
var autoClickEnabled = false; // 记录是否启用自动点击

function startAutoClick() {
    if (autoClickEnabled) {
        // 停止自动点击
        clearInterval(autoClickInterval);
        autoClickEnabled = false;
        document.getElementById('op_auto').style.color = ""; // 恢复按钮文本颜色
    }
    else {
        // 启用自动点击
        autoClickInterval = setInterval(function() {
            // 模拟点击 "SKIP" 按钮
            document.getElementById('move').click();
        }, 2000); // 设置时间间隔，这里是每1.8秒触发一次点击

        autoClickEnabled = true;
        document.getElementById('op_auto').style.color = "#c0d4e7"; // 修改按钮文本颜色为红色
    }
}


// config 和 save 菜单
 window.onload = function () {
    var array = JSON.parse(window.localStorage.userArr);
    var index = window.localStorage.userid;
 /*  document.getElementById("config_h1").innerHTML = array[index].username;
    document.getElementById("save_h1").innerHTML = array[index].username;
    var ach = 0;
    if (array[index].achi1 == 1) ach++;
    if (array[index].achi2 == 1) ach++;
    if (array[index].achi3 == 1) ach++;
    if (array[index].achi4 == 1) ach++;
    if (array[index].achi5 == 1) ach++;
    if (array[index].achi6 == 1) ach++;
    if (array[index].achi7 == 2) ach++;
    if (array[index].achi1 + array[index].achi2 + array[index].achi3 + array[index].achi4 == 4) ach++;
    document.getElementById("achievement_").innerHTML = ach + "/8";*/
}


function CV() {
    var value1 = document.getElementById("volume").value;
    var percent = value1 / 100;
    window.localStorage.nowvolume = percent;
}

function MusicPlayer() {//对话框音效
    var music = document.getElementById("music");
    if(op.music[click] != "none"){
        music.src = "../../bgm/" + op.music[click] + ".mp3";
        music.play();
        music.loop = false;
        music.preload = true;
        music.volume = 1;
    }
}

function MusicPlayer2() {//选择分支音效
    var music = document.getElementById("music2");
    music.play();
    music.loop = false;
    music.preload = true;
    music.volume = 1;
}



/*
// menu菜单界面
function Config() {
    document.getElementById('config').classList.toggle('active');
}
function Save_(section, page) {
    var gamename = '场景' + section + '第' + page + '页';
    document.getElementById("process_").innerHTML = gamename;
    document.getElementById('save').classList.toggle('active');
    window.localStorage.temp_gamename = gamename;
}
function _Save_() { 
    document.getElementById('save').classList.toggle('active');
}
*/

/*function Save1 (section = '0', page = '0') {
    var GameAddress = '../主体/sites/' + window.location.href.split('/sites/')[1]; // 更新了页面保存逻辑，可以减少出错的概率
    var GameName = window.localStorage.temp_gamename; // 可以再少改一个参数，减少出错率
    var index = window.localStorage.userid;
    if (index == -1 || index == undefined) {
        alert("未能确定当前用户状态，保存失败")
        return;
    }
    var array = JSON.parse(window.localStorage.userArr);
    array[index].GameName = GameName;
    array[index].GameAddress = GameAddress;
    window.localStorage.userArr = JSON.stringify(array);
    alert(GameName + "保存成功");
}*/
