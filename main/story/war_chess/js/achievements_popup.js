function achievement_popup(id, func)
{
  let achievement = '';
  let achievement_tilte = get_achievement_title(id);
  let achievement_content = get_achievement_content(id);
  let func_info = 'clear_achievement_icons()';
  if(func != null && func != '')
  {
    func_info = func;
  }
  achievement += '<div id = "achievement_popup_board" ><div class = "achievement_display_container"><a class = "achievement_display" class="box">成就解锁</a></div><div class = "achievement_title_container"><a class = "achievement_title" class="box">' + achievement_tilte +'</a></div><div class = "achievement_content_container"><a class = "achievement_content">' + achievement_content + '</a></div><img src = "assets/UI/confirm.png" id = "achievement_confirm_button"><a id = "achievement_confirm_button_text">确认</a></div>';
  let achievement_mask = '<img id = "achievement_confirm_button_mask" src = "assets/mask/confirm_mask.png" onclick = "' + func_info + '" onmouseenter = "load_achievement_hover_mask()" onmouseleave = "clear_achievement_hover_mask()">';
  document.getElementById("achievement_popup").innerHTML = achievement;
  document.getElementById("achievement_confirm_mask").innerHTML = achievement_mask;
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