function load_mission_icons(ingame)
{
  let mission_icons = '<div id = "task_book"><img id = "mission_confirm_button" src = "assets/UI/task_confirm.png"><a id = "mission_confirm_text">确认</a>';
  let level_title = get_level_title(level);
  mission_icons += '<div class = "title_container"><a class = "level_title">' + level_title + '</a></div>';
  mission_icons += '<div class = "subtitle_container"><a class = "mission_title">胜利条件:(任达其一)</a></div>';
  let win_conditions = get_win_condition();
  for(let i = 0; i < win_conditions.length; i ++)
  {
    mission_icons += '<div class = "mission_info_container"><a class = "mission_info">' + win_conditions[i] + '</a></div>';
  }
  mission_icons += '<div class = "subtitle_container"><a class = "mission_title">失败条件:(任达其一)</a></div>';
  let lose_conditions = get_lose_condition();
  for(let i = 0; i < lose_conditions.length; i ++)
  {
    mission_icons += '<div class = "mission_info_container"><a class = "mission_info">' + lose_conditions[i] + '</a></div>';
  }
  if(level === 2 && current_info.hidden_clue_god == false)
  {
    mission_icons += '<div class = "subtitle_container"><a class = "mission_title">支线任务</a></div><div class = "mission_info_container"><a class = "mission_info">•废墟中似乎有本奇怪的书,有机会在怪物被消灭前去看看吧!</a></div>';
  }
  if(level === 3 && current_info.hidden_clue_poison == false)
  {
    mission_icons += '<div class = "subtitle_container"><a class = "mission_title">支线任务</a></div><div class = "mission_info_container"><a class = "mission_info">•太上老君正好在!去他正下方的那个单元格看看吧!</a></div>';
  }
  if(level === 4)
  {
    mission_icons += '<div class = "subtitle_container"><a class = "mission_title">特别注意:</a></div><div class = "mission_info_container"><a class = "mission_info">•回合结束时岩浆块上的己方角色会受到2点伤害</a></div><div class = "mission_info_container"><a class = "mission_info">•盘古会每回合使用八卦神阵中的一卦</a></div><div class = "mission_info_container"><a class = "mission_info">•盘古会每数回合召唤援军</a></div>';
  }
  else if(level === 5)
  {
    mission_icons += '<div class = "subtitle_container"><a class = "mission_title">特别注意:</a></div><div class = "mission_info_container"><a class = "mission_info">•神族长老(真盘古)会每数回合召唤援军袭击死士</a></div>';
  }
  mission_icons += '</div>';
  document.getElementById("mission_icons").innerHTML = mission_icons;
  document.getElementById("mission_confirm_text").style.position = "absolute";
  document.getElementById("mission_confirm_text").style.left = "182px";
  document.getElementById("mission_confirm_text").style.top = "420px";
  let mission_confirm_mask = '<img id = "mission_confirm_mask" onclick = "mission_confirm(' + ingame + ')"  onmouseenter = "load_mission_hover_mask()" onmouseleave = "clear_mission_hover_mask()" src = "assets/mask/mission_confirm_mask.png">';
  document.getElementById("mission_confirm_masks").innerHTML = mission_confirm_mask;
}

function mission_confirm(ingame)
{
  clear_mission_icons();
  if(!ingame)
  {
    start_game();
  }
  if(current_info.is_inwar_music_on == true)
  {
  document.getElementById('audioPlayer').play();
  }
}

function get_level_title()
{
  switch(level)
  {
    case 0:
      {
        return "第一关:沐恩无能供神难";
      }
    case 1:
      {
        return "第二关:千载国恨终难泯";
      }
    case 2:
      {
        return "第三关:高墙难抵涿鹿殇";
      }
    case 3:
      {
        return "第四关:繁花开尽蓬莱山";
      }
    case 4:
      {
        return "第五关:圣兽重铸盘古身";
      }
    case 5:
      {
        return "第六关:五行终诛盘古魂";
      }
  }
}

function get_win_condition()
{
  let win_conditions = new Array();
  switch(level)
  {
    case 0:
      {
        win_conditions.push("•任一角色抵达地图最右侧红色圆圈标注处");
        win_conditions.push("•消灭全部敌人");
        break;
      }
    case 1:
      {
        win_conditions.push("•消灭全部敌人");
        break;
      }
    case 2:
      {
        win_conditions.push("•消灭全部敌人");
        break;
      }
    case 3:
      {
        win_conditions.push("•消灭全部敌人");
        break;
      }
    case 4:
      {
        win_conditions.push("•消灭8次盘古真灵(带有红色菱形标记)");
        break;
      }
    case 5:
      {
        win_conditions.push("•保护死士(红色菱形标记)至第20回合,以结成法阵.");
        break;
      }
  }
  return win_conditions;
}

function get_lose_condition()
{
  let lose_conditions = new Array();
  switch(level)
  {
    case 0:
      {
        lose_conditions.push("•" + username + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 1:
      {
        lose_conditions.push("•" + username + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 2:
      {
        lose_conditions.push("•" + username + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 3:
      {
        lose_conditions.push("•" + username + "、鸢阑、叶岱全部死亡");
        lose_conditions.push("•梓决死亡(带有绿色菱形标记)");
        break;
      }
    case 4:
      {
        lose_conditions.push("•" + username + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 5:
      {
        lose_conditions.push("•死士死亡.");
        break;
      }
  }
  return lose_conditions;
}