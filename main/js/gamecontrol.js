var count = op.steps;//总点击次数
var pagename = op.nextpage;
var page_type = op.type;//场景类型：0为自动跳转，1为分支选择，2为结局决定
var click = 0;//当前点击次数


function next_text() {
    $("#overlayText").hide();
    // $("#name").hide();
    // if (op.name[click] != "旁白") {
    //     document.getElementById("name").innerHTML = "【" + op.name[click] + "】";
    // }
    // else {
    //     document.getElementById("name").innerHTML = "<br>";
    // }
    document.body.style.backgroundImage = op.images[click];
    document.getElementById("overlayText").innerHTML = op.texts[click];
    $("#overlayText").fadeIn();
    // $("#name").fadeIn();
    return;
}

//跳转指定页面
function goto(apage) {
    $("body").fadeOut(1000, function () { window.location.replace(apage); })
};

function next_move(ending) {
    //如果当前未到该页面结束，执行一系列动画
    if (click < count) {
        next_text();
        click++;
    }
    else {//本页面已结束
        switch (page_type) {
            case 0://自动跳转
                goto(pagename);
                break;
            case 1://分支选择框出现
                $("#selection_box").fadeIn();
                break;
            case 2:
                $("#_selection_box").fadeIn();
                break;
        }
    }
};

function Return() {
    window.location.href = '../index.html';
}