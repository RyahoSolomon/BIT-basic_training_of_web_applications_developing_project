// 全局变量定义 // 控制动画执行的变量
let imageContainer = document.getElementById('plot_mask_img'); // 获取 image-container

function initial_variables()
{
  imageContainer = document.getElementById('plot_mask_img'); // 获取 image-container
}

// 监听 DOMContentLoaded 事件
// document.addEventListener('DOMContentLoaded', function () {
//     // 根据变量 executeAnimation 的值决定是否执行动画
//     if (executeAnimation === 1) {
//         console.log("监听到!");
//         startSlideImageAnimation();
//     }

//     // 为 image-container 添加点击事件，最后一次点击触发滑出页面动画
//     imageContainer.addEventListener('click', function () {
//         if (executeAnimation === 1 && currentTextIndex >= 9) {
//             slideImage.style.bottom = '-20vh'; // 改变 bottom 值滑出页面
//         }
//     });
// });

// 开始 slideImage 动画的函数
function loadPlots()
{
  document.getElementById("plot").innerHTML = '<div class = "plot_container"><div class="name_container"><div id = "name_content" class="name_content"></div></div><div class = "plot_text_container"><div id = "plot_text_content" class="plot_text_content" ></div></div></div>';
  document.getElementById("plot_mask").innerHTML = '<img src = "assets/mask/plot_mask.png" id = "plot_mask_img">';
  initial_variables();
  if(level == 2)
  {
    setTimeout("initialPlotCLickListener()", 1000 );
    setTimeout("onSlideImageTransitionEnd()", 1000 );
  }
  let initial_name = "系统";
  let initial_text = "你找到了本关隐藏线索,点击对话框查看剧情";
  if(level == 3)
  {
    initial_name = "太上老君";
    initial_text = "呼,三位侠客,谢谢你们来救援,我这老骨头实在是打不动架了."
    document.getElementById("plot_mask").onclick = "";
    initial_dialogue_option();
    document.getElementById("plot_mask_img").style.cursor = "default";
  }
  document.getElementById("name_content").innerHTML = initial_name;
  document.getElementById("plot_text_content").innerHTML = initial_text;
}

function initial_dialogue_option()
{
  document.getElementById("plot_option").innerHTML += '<div id = "dialogue_option_1" class = "dialogue_option"><div class = "dialogue_option_text">这是在下该做的,我们继续战斗去了!</div></div><div id = "dialogue_option_2" class = "dialogue_option"><div class = "dialogue_option_text">太上老君您好...我想问您一些关于人族炼丹配方的事...</div></div>';
  document.getElementById("plot_option_masks").innerHTML = '<img src = "assets/mask/dialogue_option_mask.png" id = "diaglogue_option_mask_1" class = "diaglogue_option_mask" onmouseenter = "load_dialogue_hover_mask(0)" onmouseleave = "clear_dialogue_hover_mask()" onclick = "leave_dialogue()"><img src = "assets/mask/dialogue_option_mask.png" id = "diaglogue_option_mask_2" class = "diaglogue_option_mask" onmouseenter = "load_dialogue_hover_mask(1)" onmouseleave = "clear_dialogue_hover_mask()" onclick = "continue_dialogue()">' 
}

function continue_dialogue()
{
  current_info.hidden_clue_poison = true;
  document.getElementById("plot_option").innerHTML = "";
  document.getElementById("plot_option_masks").innerHTML = "";
  document.getElementById("plot_option_hover_masks").innerHTML = "";
  localStorage.setItem("current", JSON.stringify(current_info));
  document.getElementById("plot_mask_img").style.cursor = "pointer";
  for(let i = 0; i < items.length; i++)
  {
    if(items[i].type == "trigger")
    {
      items.splice(i,1);
      break;
    }
  }
  initialPlotCLickListener();
  onSlideImageTransitionEnd();
  showNextText();
}

function leave_dialogue()
{
  console.log("点击!");
  document.getElementById("plot").innerHTML = "";
  document.getElementById("plot_mask").innerHTML = "";
  document.getElementById("plot_option").innerHTML = "";
  document.getElementById("plot_option_masks").innerHTML = "";
  document.getElementById("plot_option_hover_masks").innerHTML = "";
}

function initialPlotCLickListener()
{
  imageContainer.addEventListener('click', showNextText);
}

function onSlideImageTransitionEnd() {
    // 移除监听器，防止多次触发
    imageContainer.removeEventListener('transitionend', onSlideImageTransitionEnd);
}

function showNextText() {
  //console.log("输出名字儿!" + currentTextIndex);
  if(level == 2)
  {
    if(currentTextIndex <= 8)
    {
      document.getElementById("name_content").innerHTML = getPlotTeller(currentTextIndex);
      document.getElementById("plot_text_content").innerHTML = getPlotContent(currentTextIndex);
    }
    else
    {
      document.getElementById("plot").innerHTML = '';
      document.getElementById("plot_mask").innerHTML = '';
    }
  }
  else if(level == 3)
  {
    if(currentTextIndex <= 13)
    {
      document.getElementById("name_content").innerHTML = getPlotTeller(currentTextIndex);
      document.getElementById("plot_text_content").innerHTML = getPlotContent(currentTextIndex);
    }
    else
    {
      document.getElementById("plot").innerHTML = '';
      document.getElementById("plot_mask").innerHTML = '';
    }
  }
	currentTextIndex++;
}

function getPlotTeller(id)
{
  let texts = [];
  if(level == 2)
  {
    texts = [username,"鸢阑","鸢阑",username,username,username,username,username, "系统"];
  }
  else if(level == 3)
  {
    texts = ["太上老君","太上老君","太上老君","太上老君","太上老君","太上老君","太上老君","太上老君","太上老君","太上老君","太上老君","太上老君",username, "系统"];
  }
  return texts[id];
}

function getPlotContent(id)
{
  let texts = [];
  if(level == 2)
  {
    texts = ["看起来很旧了,好像是关于四圣兽的...","这也不奇怪,毕竟涿鹿城是炎黄与蚩尤大战的战场上修建的古城,初代轩辕和神农一直居住在这里的...","看样子这里是一个密室,怪物攻进城把这里弄塌了才得以重见天日.","(鸢阑还在说着什么,但我已经完全听不进去了)","(因为虽然这只是个薄薄的计划书,但它里面的内容也太过于震撼了)","(上面赫然写着:凝练约千年后四圣兽可以开启造神计划的最终程式- 重塑盘古)","(此后,获得盘古力量的人类将不再受神族驱使,成为世界的主宰)","(鸢阑和叶岱看到后也陷入了沉默,但我用余光发现,叶岱看到后显然更为震惊,他在发抖...)", username + "收集到了隐藏线索,离世界真相又进了一步!"]
  }
  else if(level == 3)
  {
    texts = ["是这样啊...果然还是让人找上门来了,老夫看来再躲不了了","千余年前,我拿到了妖族的炼丹配方,那是妖族献给神族的礼物,我受了我族长老的旨意,把这配方改良后再赐给人族","但我发誓,老夫可没有做出过把配方改到必须要妖族内丹这么伤天害理的事,只是改良而已","但我随后便听说,人族为了炼丹,向妖族开战,我当时很是惊恐,想着不要赶紧找到人族修改配方","但我转念一想,配方交给人族帝王之前,只经过神族长老的手...","无论是轩辕还是神族长老他们哪个人动的手脚,我也无力改变局面.而且我猜想很有可能就是我族长老的手笔,毕竟除了我,也只有他有本事重构丹方了...","神族长老向来独裁专横,手段残忍,在他以盘古遗力的胁迫下,人族妖族都要向神族每年献上不计其数的供品.","总之,神族内部也有相当一部分人反对他呢,还和其他种族的反抗者结盟成了战神联盟,比如蓬莱的岛主,梓决,他以前就是战神联盟领头人之一呢...不过神族长老并不知道他在这儿.","可惜神族长老的力量太过强大了,战神联盟还是失败了...","总之,意识到神族长老的手笔之后,我生怕自己被灭口,于是销声匿迹, 对神族宣称呆在与世隔绝的蓬莱岛,以示自己绝不泄密.","虽然自己很是懊悔,可是在长老面前,我完全掀不起任何风浪,恐怕我会在给人族传话之前,就被长老杀了...","原本我写的丹方在这里,如果你执意要的话,但是我不知道这会不会让你惹祸上身...老夫也很希望弥补自己的过错...","(神族长老吗...)", username + "收集到了隐藏线索,离世界真相又进了一步!"];
  }
  return texts[id];
}