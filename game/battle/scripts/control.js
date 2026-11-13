function manhattan_distance_cal(x1,y1,x2,y2)
{
  //计算曼哈顿距离
  let dx = x1 - x2,dy = y1 - y2;
  if(dx < 0)
  {
    dx = -dx;
  }
  if(dy < 0)
  {
    dy = -dy;
  }
  return dx + dy;
}

function get_max(a, b)
{
  if(a > b)
  {
    return a;
  }
  return b;
}

function is_in_map(cx, cy)
{
  if(cx >= height || cy >= width || cx < 0 || cy < 0)
  {
    return false;
  }
  return true;
}

function is_unit_on(cx,cy)
{
  for(let cur = 0; cur < units_count; cur++)
  {
    if(units[cur].x == cx && units[cur].y == cy && units[cur].is_alive)
    {
      return true;
    }
  }
  return false;
}

function is_enemy_unit_on(cx,cy)
{
  for(let cur = 0; cur < units_count; cur++)
  {
    if(units[cur].x == cx && units[cur].y == cy && units[cur].is_alive && units[cur].side == 1)
    {
      return true;
    }
  }
  return false;
}

function is_friendly_unit_on(cx,cy)
{
  for(let cur = 0; cur < units_count; cur++)
  {
    if(units[cur].x == cx && units[cur].y == cy && units[cur].is_alive && units[cur].side == 0)
    {
      return true;
    }
  }
  return false;
}

function is_item_on(cx,cy)
{
  for(let cur = 0; cur < items.length; cur++)
  {
    if(items[cur].x == cx && items[cur].y == cy)
    {
      return true;
    }
  }
  return false;
}

function is_designated_side_unit_on(cx, cy, given_side)
{
  for(let i = 0; i < units_count; i++)
  {
    if(units[i].is_alive && units[i].side == given_side && units[i].x == cx && units[i].y == cy)
    {
      return i;
    }
  }
  return -1;
}

function switch_side(given_side)
{
  if(given_side == 0)
  {
    return 1;
  }
  return 0;
}

function summon_unit(cx, cy, type)
{
  //在指定位置生成一个怪物,需要保证合法
  switch(type)
  {
    case "goblin":
      {
        units.push(new Goblin());
        break;
      }
    case "ghoul":
      {
        units.push(new Ghoul());
        break;
      }
    case "giant_goblin":
      {
        units.push(new GiantGoblin());
        break;
      }
    case "alghoul":
      {
        units.push(new Alghoul());
        break;
      }
    case "mystery_man":
      {
        units.push(new MysteryMan());
        break;
      }
    case "mystery_witcher":
      {
        units.push(new MysteryWitcher());
        break;
      }
    case "spirit":
      {
        units.push(new PanguSpirit());
        break;
      }
    case "fay_warrior":
      {
        units.push(new FayWarrior());
        break;
      }
    default:
      {
        units.push(new Goblin());
      }
  }
  units[units_count].x = cx;
  units[units_count].y = cy;
  units_count++;
}

function summon_unit_in_range(cx, cy, type)
{
  //尝试以cx cy为中心生成怪物
  if(type == null)
  {
    type = "goblin";
  }
  x = cx;
  y = cy;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx + 1;
  y = cy;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx;
  y = cy + 1;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx - 1;
  y = cy;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx;
  y = cy - 1;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx + 2;
  y = cy;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx;
  y = cy + 2;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx - 2;
  y = cy;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx;
  y = cy - 2;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx + 1;
  y = cy + 1;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx + 1;
  y = cy - 1;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx - 1;
  y = cy + 1;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
  x = cx - 1;
  y = cy - 1;
  if(is_in_map(x, y) && !is_unit_on(x, y))
  {
    summon_unit(x, y, type);
    return;
  }
}

function summon_random_type(cx, cy)
{
  let key = Math.floor(Math.random() * 14);
  if(key <= 3)
  {
    return;
  }
  if(key <= 4)
  {
    summon_unit_in_range(cx, cy, "mystery_man");
    return;
  }
  if(key <= 5)
  {
    summon_unit_in_range(cx, cy, "mystery_witcher");
    return;
  }
  if(key <= 6)
  {
    summon_unit_in_range(cx, cy, "alghoul");
    return;
  }
  if(key <= 7)
  {
    summon_unit_in_range(cx, cy, "giant_goblin");
    return;
  }
  if(key <= 10)
  {
    summon_unit_in_range(cx, cy, "ghoul");
    return;
  }
  if(key <= 13)
  {
    summon_unit_in_range(cx, cy, "goblin");
    return;
  }
}

const sleep = (milliseconds) => {
  const start = Date.now();
  while (Date.now() <= start + milliseconds) {}
};

function initial_confirm()
{
  operation_count++;
  let operation_hover_initial_mask_innerhtml = '<img src = "assets/images/mask/transparent-operation-mask.png" id = "operation_hover_initial_mask_0" onmouseenter = "load_operation_hover_mask(0)" onmouseleave = "clear_operation_hover_mask()" onclick = "confirm()" title = "确认:\n此按钮用于电脑角色行动后,请确认电脑角色行动后再点击本按钮以继续.">';
  operation_button_html = '<img src = "assets/images/ui/button.png" id = "operation_button_0" >';
  operation_html = '<img src = assets/images/ui/enemy-action-confirm.png id = "operation_0" >';
  document.getElementById("operations").innerHTML = operation_html;
  document.getElementById("operation_buttons").innerHTML = operation_button_html;
  document.getElementById("operation_hover_initial_mask").innerHTML = operation_hover_initial_mask_innerhtml;
  show_operations();
}

function reset_operations()
{
  //重设交互UI
  operation_count = 0;
  document.getElementById("operations").innerHTML = '';
  document.getElementById('operation_buttons').innerHTML = '';
}

function load_mask()
{
  //加载遮罩系统
  let masks = document.getElementsByClassName("mask_img");
  let mask_count = masks.length;
  //console.log(mask_count);
  for(let i = 0; i < mask_count; i++)
  {
    let temp = masks[i].id.split('_');
    masks[i].style.position = "absolute";
    masks[i].style.left = temp[1] * 64;
    masks[i].style.top = temp[0] * 64 - 720;
  }
}

function reset_mask()
{
  //重置遮罩内容
  document.getElementById("mask").innerHTML = '';
}

function show_operations()
{
  for(let i = 0; i < operation_count; i++)
  {
    let temp = document.getElementById("operation_button_"+i);
    temp.style.position = "absolute";
    temp.style.left = 24 + 120 * i;
    temp.style.top = -144 + 24;
    temp = document.getElementById("operation_"+i);
    temp.style.position = "absolute";
    temp.style.left = 24 + 120 * i + 10;
    temp.style.top = -144 + 34;
    temp = document.getElementById("operation_hover_initial_mask_" + i);
    temp.style.position = "absolute";
    temp.style.left = 24 + 120 * i;
    temp.style.top = -144 + 24;
  }
}

function is_all_friendly_killed()
{
  for(let i = 0;i < units_count; i++)
  {
    if(units[i].side == 0)
    {
      if(units[i].is_alive)
      {
        return false;
      }
    }
  }
  return true;
}

function is_designated_unit_dead(name)
{
  for(let i = 0; i < units_count; i++)
  {
    if(units[i].side == 0)
    {
      if(units[i].name == name)
      {
        if(units[i].is_alive)
        {
          return false;
        }
        return true;
      }
    }
  }
  return true;
}

function is_all_designated_units_dead(name)
{
  for(let i = 0; i < units_count; i++)
  {
    if(units[i].name == name)
    {
      if(units[i].is_alive)
      {
        return false;
      }
    }
  }
  return true;
}

function fuck_away(id)
{
  //强制让指定实体离开原位置
  let diss = 0;
  while(true)
  {
    diss++;
    for(let i = units[id].x - diss; i <= units[id].x + diss; i++)
    {
      if(is_in_map(i, units[id] + diss) && !is_unit_on(i, units[id].y + diss))
      {
        units[id].x = i;
        units[id].y += diss;
        return;
      }
      if(is_in_map(i, units[id] - diss) && !is_unit_on(i, units[id].y - diss))
      {
        units[id].x = i;
        units[id].y -= diss;
        return;
      }
    }
    for(let ty = units[id].y - diss + 1; ty <= units[id].y + diss - 1; ty++)
    {
      if(is_in_map(units[id].x + diss, ty) && !is_unit_on(units[id].x + diss, ty))
      {
        units[id].x = units[id].x + diss;
        units[id].y = ty;
      }
      if(is_in_map(units[id].x - diss, ty) && !is_unit_on(units[id].x - diss, ty))
      {
        units[id].x = units[id].x - diss;
        units[id].y = ty;
      }
    }
  }
}

function save_exp_info()
{
  // console.log("开始搜索");
  for(let i = 0; i < units_count; i++)
  {
    if(units[i].commander_type == "player")
    {
      switch(units[i].name)
      {
        case "user":
        {
          // console.log("user信息储存成功!");
          user_level.level = units[i].level;
          user_level.exp = units[i].exp;
        }
        case "yuanlan":
        {
          // console.log("鸟信息储存成功!");
          yuanlan_level.level = units[i].level;
          yuanlan_level.exp = units[i].exp;
        }
        case "yedai":
        {
          // console.log("山信息储存成功!");
          yedai_level.level = units[i].level;
          yedai_level.exp = units[i].exp;
        }
      }
    }
  }
  // console.log("level:" + level)
  current_info.level = level;
  // console.log("current_info.level:" + current_info.level)
  current_info.user_level = user_level;
  current_info.yuanlan_level = yuanlan_level;
  current_info.yedai_level = yedai_level;
  localStorage.setItem("current", JSON.stringify(current_info));
  // let temp = JSON.parse(localStorage.getItem("current"));
  // console.log("temp.level:" + temp.level);
  console.log("储存完成");
}

function game_over()
{
  save_exp_info();
}

function win()
{
  game_over();
  switch(level)
  {
    case 0:
      {
        location.href = "results/level-1/win.html";
        break;
      }
    case 1:
      {
        location.href = "results/level-2/win.html";
        break;
      }
    case 2:
      {
        location.href = "results/level-3/win.html";
        break;
      }
    case 3:
      {
        location.href = "results/level-4/win.html";
        break;
      }
    case 4:
      {
        location.href = "results/level-5/win.html";
        break;
      }
    case 5:
      {
        location.href = "results/level-extra/win.html";
        break;
      }
  }
}

function lose()
{
  game_over();
  switch(level)
  {
    case 0:
      {
        location.href = "results/level-1/lose.html";
        break;
      }
    case 1:
      {
        location.href = "results/level-2/lose.html";
        break;
      }
    case 2:
      {
        location.href = "results/level-3/lose.html";
        break;
      }
    case 3:
      {
        location.href = "results/level-4/lose.html";
        break;
      }
    case 4:
      {
        location.href = "results/level-5/lose.html";
        break;
      }
    case 5:
      {
        location.href = "results/level-extra/lose.html";
        break;
      }
  }
}

function selected_box_update()
{
  document.getElementById("selected_box").innerHTML = '<img src = "assets/images/mask/selected.png" id = "' + units[current_act_unit].x + '_' + units[current_act_unit].y + '" class = "selected_box">';
  let temp = document.getElementsByClassName("selected_box")[0];
  temp.style.position = "absolute";
  temp.style.top = -720 + 64 * units[current_act_unit].x;
  temp.style.left = 64 * units[current_act_unit].y;
}

function start_turn()
{
  load_annoucement();
  units_display_update();
  load_items();
  if(units[current_act_unit].commander_type == "player")
  {
    have_moved = false;
    selected_box_update()
    units[current_act_unit].commander.initial_UI(current_act_unit);
  }
  else
  {
    computer_operate();
  }
}

// 持续效果按流血、中毒、强化、地形与冷却的原顺序处理，死亡后停止本轮剩余效果。
function apply_end_round_effects()
{
  for(let i = 0; i < units_count; i++)
  {
    const unit = units[i];
    if(!unit.is_alive) continue;
    if(unit.blooding) unit.get_hurt(2);
    if(!unit.is_alive) continue;
    if(unit.poison > 0)
    {
      unit.get_hurt(unit.poison);
      unit.poison--;
    }
    if(!unit.is_alive) continue;
    if(unit.reinforce > 0)
    {
      unit.reinforce--;
      if(unit.reinforce == 0)
      {
        unit.speed--;
        unit.attack--;
      }
    }
    if(map[unit.x][unit.y] == 12) unit.get_hurt(2, null, { ignoreArmor: true });
    if(!unit.is_alive) continue;
    if(unit.commander_type == "player")
    {
      if(unit.current_cooldown[0] > 0) unit.current_cooldown[0]--;
      if(unit.current_cooldown[1] > 0) unit.current_cooldown[1]--;
    }
  }
}

function end_round()
{
  if(settle_battle()) return true;
  round++;
  document.getElementById("round_info_text").innerHTML = round;
  for(let i = 0; i < units_count; i++)
  {
    if(units[i].is_alive)
    {
      if(units[i].commander_type == "player")
      {
        level_up(i, units[i].max_armor - units[i].armor);
      }
      units[i].armor = units[i].max_armor;
    }
  }
  units_display_update();
  load_items();
  apply_end_round_effects();
  for(let i = 0; i < items.length; i++)
  {
    items[i].effect();
  }
  for(let i = 0; i < items.length; i++)
  {
    if(items[i].rest_existing_turn == 0)
    {
      if(items[i].type == "swamp" && items[i].triggered == false)
      {
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].side == 0 && units[i].is_alive)
          {
            units[i].poison += 2;
          }
        }
      }
      if(items[i].type == "thunder" && items[i].triggered == false)
      {
        let temp = new Array();
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].side == 0 && units[i].is_alive)
          {
            temp.push({
              health: units[i].health + units[i].armor,
              id: units[i].uuid,
            })
          }
        }
        temp.sort(function(a,b){return (b.health - a.health)});
        if(temp.length > 0)
        {
          units[temp[0].id].get_hurt(4);
        }
      }
      items.splice(i,1);
      i--;
      continue;
    }
    if(items[i].rest_existing_turn > 0)
    {
      items[i].rest_existing_turn--;
    }
  }
  units_display_update();
  load_items();
  switch(level)
  {
    //按关卡每回合进行更新
    case 4:
      {
        if(round % 5 == 0)
        {
          summon_unit_in_range(2, 1, "ghoul");
          summon_unit_in_range(6, 2, "ghoul");
          summon_unit_in_range(5, 0, "goblin");
          announcement_list.push("[第" + round + "回合]盘古召唤了怪物援军!");
          load_annoucement();
        }
        let skill_1 = Math.floor(Math.random() * 8);
        fake_pangu_skill_execute(skill_1);
        summon_pangu_spirit();
        break;
      }
    case 5:
      {
        if(round % 2 == 0)
        {
          summon_random_type(1, 1);
          summon_random_type(4, 1);
          summon_random_type(7, 1);
          announcement_list.push("[第" + round + "回合]盘古手下的怪物向死士袭来!");
          load_annoucement();
        }
        else
        {
          summon_random_type(4, 18);
          summon_random_type(1, 18);
          summon_random_type(7, 18);
          announcement_list.push("[第" + round + "回合]盘古手下的怪物向死士袭来!");
          load_annoucement();
        }
        if(achievements.ach2 && round % 7 == 0)
        {
          summon_unit_in_range(1, 7, "fay_warrior");
          summon_unit_in_range(7, 12, "fay_warrior");
          announcement_list.push("[第" + round + "回合][妖族监国]妖族决不退缩!妖族英勇的战士们!随我帮助" + username + "保护阵法死士!");
          load_annoucement();
        }
        break;
      }
  }
  load_annoucement();
  units_display_update();
  load_items();
  // 整轮效果可能改变胜负；先结算，再由调用方选择下一位行动者。
  return settle_battle();
}

function summon_pangu_spirit()
{
  if(is_all_designated_units_dead("spirit"))
  {
    console.log("已击杀元神数:" + spirit_count);
    let availiable_pos = new Array();
    for(let i = 0; i < spirit_pos.length; i++)
    {
      if(!is_unit_on(spirit_pos[i].x, spirit_pos[i].y))
      {
        availiable_pos.push(spirit_pos[i]);
      }
    }
    if(availiable_pos.length > 0)
    {
      let k = Math.floor(Math.random() * availiable_pos.length);
      summon_unit(availiable_pos[k].x, availiable_pos[k].y, "spirit");
    }
    else{
      let k = Math.floor(Math.random() * spirit_pos.length);
      for(let i = 0; i < units_count; i++)
      {
        if(units[i].x == spirit_pos[k].x && units[i].y == spirit_pos[k].y)
        {
          fuck_away(i);
          break;
        }
        summon_unit(spirit_pos[k].x, spirit_pos[k].y, "spirit");
      }
    }
    announcement_list.push("[第" + round + "回合]盘古真灵出现了!快去消灭它!");
    load_annoucement();
  }
}

function end_turn()
{
  if(settle_battle()) return;
  units_display_update();
  load_items();
  reset_mask();
  reset_operations();
  sleep(300);
  load_annoucement()
  while(true)
  {
    current_act_unit++;
    if(current_act_unit >= units_count)
    {
      if(end_round()) return;
      current_act_unit = 0;
    }
    if(units[current_act_unit].is_alive)
    {
      break;
    }
  }
  start_turn();
}

function fake_pangu_skill_execute(skill)
{
  let max_try_count = 3000;
  let try_count = 0;
  switch(skill)
  {
    case 0:
      {
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].is_alive && units[i].side == 0)
          {
            units[i].get_hurt(2);
          }
        }
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-乾天,对我方全体角色造成两点伤害!");
        break;
      }
    case 1:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-坤地,地面上出现巨大裂缝,回合结束时站在上面的己方角色立刻死亡!");
        for(let i = 0; i < 12; )
        {
          try_count++;
          if(try_count > max_try_count)
          {
            return;
          }
          let k = Math.floor(Math.random() * earthquake_pos.length);
          if(is_item_on(earthquake_pos[k].x, earthquake_pos[k].y))
          {
            continue;
          }
          items.push(new Earthquake(earthquake_pos[k].x, earthquake_pos[k].y));
          i++;
        }
        break;
      }
    case 2:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-离火,场上出现火焰,回合结束时对火焰内单位造成两点伤害!");
        for(let i = 0; i < 9; )
        {
          try_count++;
          if(try_count > max_try_count)
          {
            return;
          }
          let k = Math.floor(Math.random() * fire_pos.length);
          if(is_item_on(fire_pos[k].x, fire_pos[k].y))
          {
            continue;
          }
          items.push(new Fire(fire_pos[k].x, fire_pos[k].y));
          i++;
        }
        break;
      }
    case 3:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-坎水,巨大的水流将我方单位向左推动!");
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].side == 0 && units[i].is_alive)
          {
            for(let ty = get_max(0,units[i].y - 6); ty < units[i].y; ty++)
            {
              if(!is_unit_on(units[i].x, ty))
              {
                units[i].y = ty;
                break;
              }
            }
          }
        }
        break;
      }
    case 4:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-兑泽,场上出现沼核,需派一名角色在其消失前移动到其上,否则己方角色会陷入中毒!");
        let k = Math.floor(Math.random() * swamp_pos.length);
        while(is_item_on(swamp_pos[k].x, swamp_pos[k].y))
        {
          k = Math.floor(Math.random() * swamp_pos.length);
        }
        items.push(new Swamp(swamp_pos[k].x, swamp_pos[k].y));
        break;
      }
    case 5:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-震雷,场上出现雷霆核心,需派一名角色在其消失前移动到其上,否则己方角色一名角色将遭受巨大伤害.");
        let k = Math.floor(Math.random() * thunder_pos.length);
        while(is_item_on(thunder_pos[k].x, thunder_pos[k].y))
        {
          k = Math.floor(Math.random() * thunder_pos.length);
        }
        items.push(new Thunder(thunder_pos[k].x, thunder_pos[k].y));
        break;
      }
    case 6:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-巽风,召唤封豨助战!");
        summon_unit_in_range(2, 17, "giant_goblin");
        break;
      }
    case 7:
      {
        announcement_list.push("[第" + round + "回合]盘古发动八卦阵-艮山,召唤恶鬼助战!");
        summon_unit_in_range(2, 17, "alghoul");
        break;
      }
  }
}