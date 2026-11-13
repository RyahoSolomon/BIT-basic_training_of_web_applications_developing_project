// Shared save/load functions. Storage keys and data format remain compatible.
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
        window.location.href = "../map/index.html";
    }else{
        alert("找不到游戏地址");
    }
}

