// 存储中的成就键与展示编号只在此对应，避免不同结算入口提示错位。
const ACHIEVEMENT_IDS = Object.freeze({
  ach1: 0, ach2: 1, ach3: 2, ach4: 3, ach5: 4, ach6: 5, ach7: 6, ach8: 7,
});
const achievement_popup_queue = [];
const achievement_popup_waiters = [];

function achievement_popup(id, onConfirm)
{
  achievement_popup_queue.push({ id, onConfirm });
  if(achievement_popup_queue.length === 1) show_next_achievement_popup();
}

function after_achievement_popups(callback)
{
  if(achievement_popup_queue.length === 0) callback();
  else achievement_popup_waiters.push(callback);
}

function show_next_achievement_popup()
{
  const entry = achievement_popup_queue[0];
  const title = get_achievement_title(entry.id);
  const content = get_achievement_content(entry.id);
  document.getElementById("achievement_popup").innerHTML =
    '<div id="achievement_popup_board">' +
      '<div class="achievement_display_container"><a class="achievement_display">成就解锁</a></div>' +
      '<div class="achievement_title_container"><a class="achievement_title">' + title + '</a></div>' +
      '<div class="achievement_content_container"><a class="achievement_content">' + content + '</a></div>' +
      '<img src="assets/images/ui/confirm.png" id="achievement_confirm_button">' +
      '<a id="achievement_confirm_button_text">确认</a>' +
    '</div>';
  document.getElementById("achievement_confirm_mask").innerHTML =
    '<img id="achievement_confirm_button_mask" src="assets/images/mask/confirm-mask.png">';
  const button = document.getElementById("achievement_confirm_button_mask");
  button.onmouseenter = load_achievement_hover_mask;
  button.onmouseleave = clear_achievement_hover_mask;
  let confirmed = false;
  button.onclick = function () {
    // 即使旧按钮或旧回调再次触发，也只能消费它自己的这一次确认。
    if(confirmed) return;
    confirmed = true;
    clear_achievement_icons();
    achievement_popup_queue.shift();
    if(achievement_popup_queue.length > 0) show_next_achievement_popup();
    if(typeof entry.onConfirm === 'function') entry.onConfirm();
    while(achievement_popup_queue.length === 0 && achievement_popup_waiters.length > 0) {
      achievement_popup_waiters.shift()();
    }
  };
}

function initial_achievements()
{
  if(achievements == null)
  {
    //console.log("成就读取失败");
    achievements = 
    {
      ach1: false,
      ach2: false,
      ach3: false,
      ach4: false,
      ach5: false,
      ach6: false,
      ach7: false,
      ach8: false,
    }
    localStorage.setItem("achievements",JSON.stringify(achievements));
  }
  else
  {
    achievements = JSON.parse(achievements);
  }
}

function get_achievement_title(id)
{
  switch(id)
  {
    case 0:
      {
        return "一个都不许少";//
      }
    case 1:
      {
        return "保护坚果";
      }
    case 2:
      {
        return "铲除神族";//
      }
    case 3:
      {
        return "向死则生";//
      }
    case 4:
      {
        return "正经人谁从左上角开始扫雷啊!";
      }
    case 5:
      {
        return "神所创造的世界 并非完美";
      }
    case 6:
      {
        return "唯我独尊";
      }
    case 7:
      {
        return "杀人如麻 以杀证道";//
      }
  }
}

function get_achievement_content(id)
{
  switch(id)
  {
    case 0:
      {
        return "所有关卡都至少在没有己方角色阵亡的情况下通关.";
      }
    case 1:
      {
        return "在第二关胜利后,选择放掉妖族监国.";
      }
    case 2:
      {
        return "用主角或者鸢阑击杀叶岱.";
      }
    case 3:
      {
        return "在只剩一名角色的情况下,通过一道关卡.";
      }
    case 4:
      {
        return "在躲避陷阱阵法的过程中,第一下翻开格子便踏入陷阱.";
      }
    case 5:
      {
        return "达成真结局.";
      }
    case 6:
      {
        return "所有角色升至满级.";
      }
    case 7:
      {
        return "在第一关中,选择击杀全部敌方单位而非到达指定点.";
      }
  }
}