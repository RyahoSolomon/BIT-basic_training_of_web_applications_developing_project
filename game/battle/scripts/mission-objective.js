function initialize_mission_book() {
  const dialog = document.getElementById('task_book');
  function openMission() {
    if (dialog.open) return;
    render_mission_book();
    dialog.showModal();
    set_mission_turn_paused(true);
  }
  function closeMission() {
    if (!dialog.open) return;
    dialog.close();
    set_mission_turn_paused(false);
  }
  document.getElementById('mission_confirm_button').addEventListener('click', closeMission);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeMission();
  });
  dialog.addEventListener('close', () => {
    // A new review can open before the previous close event is delivered.
    if (!dialog.open) set_mission_turn_paused(false);
  });
  document.getElementById('check_mission_info_mask').addEventListener('click', openMission);
  openMission();
}

function render_mission_book() {
  document.getElementById('mission_title').textContent = get_level_title();
  const conditions = document.getElementById('mission_conditions');
  conditions.replaceChildren();
  function addSection(title, lines) {
    const heading = document.createElement('h3');
    heading.textContent = title;
    conditions.append(heading);
    for (const text of lines) {
      const line = document.createElement('p');
      line.textContent = text;
      conditions.append(line);
    }
  }

  addSection('胜利条件:(任达其一)', get_win_condition());
  addSection('失败条件:(任达其一)', get_lose_condition());
  if (level === 2 && !current_info.hidden_clue_god) {
    addSection('支线任务', ['•废墟中似乎有本奇怪的书,有机会在怪物被消灭前去看看吧!']);
  }
  if (level === 3 && !current_info.hidden_clue_poison) {
    addSection('支线任务', ['•太上老君正好在!去他正下方的那个单元格看看吧!']);
  }
  if (level === 4) {
    addSection('特别注意:', [
      '•回合结束时岩浆块上的己方角色会受到2点伤害',
      '•盘古会每回合使用八卦神阵中的一卦',
      '•盘古会每数回合召唤援军',
    ]);
  } else if (level === 5) {
    addSection('特别注意:', ['•神族长老(真盘古)会每数回合召唤援军袭击死士']);
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
        lose_conditions.push("•" + displayName + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 1:
      {
        lose_conditions.push("•" + displayName + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 2:
      {
        lose_conditions.push("•" + displayName + "、鸢阑、叶岱全部死亡");
        break;
      }
    case 3:
      {
        lose_conditions.push("•" + displayName + "、鸢阑、叶岱全部死亡");
        lose_conditions.push("•梓决死亡(带有绿色菱形标记)");
        break;
      }
    case 4:
      {
        lose_conditions.push("•" + displayName + "、鸢阑、叶岱全部死亡");
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
