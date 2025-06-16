function confirm()
{
  reset_mask();
  document.getElementById("selected_box").innerHTML = '';
  document.getElementById("operation_hover_initial_mask").innerHTML = '';
  clear_operation_hover_mask();
  end_turn();
}

function selected_attack(id)
{
  selected_operation = "attack";
  reset_mask();
  let mask_innerhtml = '';
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      let distance = manhattan_distance_cal(i,j,units[id].x,units[id].y);
      if(distance >= units[id].min_range && distance <= units[id].max_range)
      {
        let flag = false;
        for(let cur = 0; cur < units_count; cur++)
        {
          if(units[cur].x == i && units[cur].y == j && units[cur].is_alive)
          {
            mask_innerhtml += '<img src = "assets/mask/can_attack.png" id = "' + i + '_' + j + '" onclick = "click_block(' + i + ',' + j +')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在攻击范围内\n攻击此单位">';
            flag = true;
          }
        }
        if(!flag)
        {
          mask_innerhtml += '<img src = "assets/mask/touchable.png" id ="' + i + '_' + j + '" class = "mask_img" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在攻击范围内\n无法发动攻击:此单元格上无单位">';
        }
      }
    }
  }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_move(id)
{
  selected_operation = "move";
  document.getElementById("mask").innerHTML='';
  let mask_innerhtml = '';
  let reachable_blocks = new Queue;
  reachable_blocks.push(new PointWithDistance(units[id].x, units[id].y, 0));
  let vis = new Array();
  for(let i = 0; i < height; i++)
  {
    vis[i] = new Array();
    for(let j = 0; j < width; j++)
    {
      vis[i][j] = false;
      //console.log(vis[i][j],)
    }
  }
  while(!reachable_blocks.empty())
  {
    let current_block = reachable_blocks.top();
    //console.log("当前检测到(" + current_block.x + "," + current_block.y + ") 距离为" + current_block.distance)
    if(current_block.distance >= units[id].speed)
    {
      break;
    }
    if(current_block.x + 1 < height)
    {
      let cx = current_block.x + 1;
      let cy = current_block.y;
      //console.log(vis[cx][cy]);
      //console.log(is_block_reachable(cx,cy));
      if(!vis[cx][cy] && is_block_reachable(cx, cy))
      {
        let flag = false;
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].is_alive && units[i].x == cx && units[i].y == cy)
          {
            flag = true;
            vis[cx][cy] = true;
            if(units[i].side == units[id].side)
            {
              reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
            }
            break;
          }
        }
        if(!flag)
        {
          reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
          vis[cx][cy] = true;
          mask_innerhtml += '<img src = "assets/mask/can_move_on.png" id = "' + cx + '_' + cy + '" onclick = "click_block(' + cx + ',' + cy +')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + cx + ',' + cy + ')" onmouseleave = "delete_hover_mask(' + cx + ',' + cy + ')"  title = "移动到(' + (cy + 1) + ',' + (cx + 1) + ')">';
        }
      }
    }
    if(current_block.x - 1 >= 0)
    {
      let cx = current_block.x - 1;
      let cy = current_block.y;
      //console.log(vis[cx][cy]);
      //console.log(is_block_reachable(cx,cy));
      if(!vis[cx][cy] && is_block_reachable(cx, cy))
      {
        let flag = false;
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].is_alive && units[i].x == cx && units[i].y == cy)
          {
            flag = true;
            vis[cx][cy] = true;
            if(units[i].side == units[id].side)
            {
              reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
            }
            break;
          }
        }
        if(!flag)
        {
          reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
          vis[cx][cy] = true;
          mask_innerhtml += '<img src = "assets/mask/can_move_on.png" id = "' + cx + '_' + cy + '" onclick = "click_block(' + cx + ',' + cy +')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + cx + ',' + cy + ')" onmouseleave = "delete_hover_mask(' + cx + ',' + cy + ')"  title = "移动到(' + (cy + 1) + ',' + (cx + 1) + ')">';
        }
      }
    }
    if(current_block.y + 1 < width)
    {
      let cx = current_block.x;
      let cy = current_block.y + 1;
      //console.log(vis[cx][cy]);
      //console.log(is_block_reachable(cx,cy));
      if(!vis[cx][cy] && is_block_reachable(cx, cy))
      {
        let flag = false;
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].is_alive && units[i].x == cx && units[i].y == cy)
          {
            flag = true;
            vis[cx][cy] = true;
            if(units[i].side == units[id].side)
            {
              reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
            }
            break;
          }
        }
        if(!flag)
        {
          reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
          vis[cx][cy] = true;
          mask_innerhtml += '<img src = "assets/mask/can_move_on.png" id = "' + cx + '_' + cy + '" onclick = "click_block(' + cx + ',' + cy +')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + cx + ',' + cy + ')" onmouseleave = "delete_hover_mask(' + cx + ',' + cy + ')"  title = "移动到(' + (cy + 1) + ',' + (cx + 1) + ')">';
        }
      }
    }
    if(current_block.y - 1 >= 0)
    {
      let cx = current_block.x;
      let cy = current_block.y - 1;
      // console.log(vis[cx][cy]);
      // console.log(is_block_reachable(cx,cy));
      if(!vis[cx][cy] && is_block_reachable(cx, cy))
      {
        let flag = false;
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].is_alive && units[i].x == cx && units[i].y == cy)
          {
            flag = true;
            vis[cx][cy] = true;
            if(units[i].side == units[id].side)
            {
              reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
            }
            break;
          }
        }
        if(!flag)
        {
          reachable_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
          vis[cx][cy] = true;
          mask_innerhtml += '<img src = "assets/mask/can_move_on.png" id = "' + cx + '_' + cy + '" onclick = "click_block(' + cx + ',' + cy +')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + cx + ',' + cy + ')" onmouseleave = "delete_hover_mask(' + cx + ',' + cy + ')"  title = "移动到(' + (cy + 1) + ',' + (cx + 1) + ')">';
        }
      }
    }
    reachable_blocks.pop();
  }
  // for(let i = 0; i < height; i++)
  // {
  //   for(let j = 0; j < width; j++)
  //   {

  //     if(manhattan_distance_cal(i,j,units[id].x,units[id].y) <= units[id].speed)
  //     {
  //       let flag = false;
  //       if(!is_block_reachable(i, j))
  //       {
  //         continue;
  //       }
  //       for(let k = 0; k < units_count; k++)
  //       {
  //         if(units[k].x == i && units[k].y == j && units[k].is_alive)
  //         {
  //           flag = true;
  //         }
  //       }
  //       if(flag)
  //       {
  //         continue;
  //       }
  //     }
  //   }
  // }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_defend()
{
  selected_operation = "defend";
  reset_mask();
  let armor_change_value = 4;
  if(units[current_act_unit].level >= 6)
  {
    armor_change_value += 2;
  }
  if(units[current_act_unit].defending == true)
  {
    units[current_act_unit].defending = false;
    units[current_act_unit].max_armor -= armor_change_value;
    if(units[current_act_unit].armor > units[current_act_unit].max_armor)
    {
      units[current_act_unit].armor = units[current_act_unit].max_armor;
    }
    units[current_act_unit].speed += 1;
    units_display_update();
    load_items();
  }
  else
  {
    units[current_act_unit].defending = true;
    units[current_act_unit].max_armor += armor_change_value;
    units[current_act_unit].armor = units[current_act_unit].max_armor;
    units[current_act_unit].speed -= 1;
    units_display_update();
    load_items();
    document.getElementById("selected_box").innerHTML = '';
    document.getElementById("operation_hover_initial_mask").innerHTML = '';
    clear_operation_hover_mask();
    end_turn();
  }
}

function selected_trap()
{
  selected_operation = "trap";
  reset_mask();
  let skill_attack = units[current_act_unit].attack;
  let mask_innerhtml = '';
  let skill_range = parseInt(units[current_act_unit].max_range);
  if(units[current_act_unit].level >= 6)
  {
    skill_range += 1;
    skill_attack += 2;
  }
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      let distance = manhattan_distance_cal(i,j,units[current_act_unit].x,units[current_act_unit].y);
      if(distance <= skill_range)
      {
        if(is_unit_on(i,j))
        {
          continue;
        }
        if(is_item_on(i,j))
        {
          continue;
        }
        mask_innerhtml += '<img src = "assets/mask/can_place_item_on.png" id = "' + i + '_' + j + '" onclick = "place_trap_on(' + i + ',' + j + ',' + skill_attack + ')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在此处布置捕兽夹陷阱">';
      }
    }
  }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_ice_storm()
{
  selected_operation = "ice_storm";
  reset_mask();
  let mask_innerhtml = '';
  let skill_range = units[current_act_unit].max_range + 3;
  let skill_attack = units[current_act_unit].attack - 1;
  if(units[current_act_unit].level >= 6)
  {
    skill_range += 1;
    skill_attack += 1;
  }
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      //console.log("当前搜寻:" + i + "," + j);
      let distance = manhattan_distance_cal(i,j,units[current_act_unit].x,units[current_act_unit].y);
      //console.log("当前位置:" + i + "," + j);
      if(distance <= skill_range)
      {
        //console.log("可行");
        mask_innerhtml += '<img src = "assets/mask/skill_range_mask.png" id = "' + i + '_' + j + '" onclick = "use_ice_storm(' + i + ',' + j + ',' + skill_attack + ')" class = "mask_img clickable_mask" onmouseenter = "load_magic_storm_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "以此单元格为中心释放魔法风暴">';
      }
    }
  }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_whack()
{
  selected_operation = "whack";
  reset_mask();
  let mask_innerhtml = '';
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      let distance = manhattan_distance_cal(i,j,units[current_act_unit].x,units[current_act_unit].y);
      if(distance >= units[current_act_unit].min_range && distance <= units[current_act_unit].max_range)
      {
        let flag = false;
        for(let cur = 0; cur < units_count; cur++)
        {
          if(units[cur].x == i && units[cur].y == j && units[cur].is_alive)
          {
            mask_innerhtml += '<img src = "assets/mask/can_attack.png" id = "' + i + '_' + j + '" onclick = "whack(' + i + ',' + j + ',' + (units[current_act_unit].attack + 2) + ')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在攻击范围内\n对此单位发动向死则生">';
            flag = true;
            break;
          }
        }
        if(!flag)
        {
          mask_innerhtml += '<img src = "assets/mask/whack_range_mask.png" id ="' + i + '_' + j + '" class = "mask_img" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在攻击范围内\n无法发动攻击:此单元格上无可攻击单位">';
        }
      }
    }
  }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_poison()
{
  selected_operation = "poison";
  reset_mask();
  let mask_innerhtml = '';
  let skill_range = units[current_act_unit].max_range;
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      //console.log("当前搜寻:" + i + "," + j);
      let distance = manhattan_distance_cal(i,j,units[current_act_unit].x,units[current_act_unit].y);
      if(distance <= skill_range)
      {
        //console.log("可行");
        mask_innerhtml += '<img src = "assets/mask/touchable.png" id = "' + i + '_' + j + '" onclick = "poison_cloud(' + i + ',' + j + ',' + (units[current_act_unit].attack - 1) + ')" class = "mask_img clickable_mask" onmouseenter = "load_poison_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "以此单元格为中心释放秘法毒云">';
      }
    }
  }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_buff()
{
  selected_operation = "buff";
  reset_mask();
  let mask_innerhtml = '';
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      let distance = manhattan_distance_cal(i, j, units[current_act_unit].x, units[current_act_unit].y);
      if(distance <= units[current_act_unit].max_range)
      {
        let flag = false;
        for(let cur = 0; cur < units_count; cur++)
        {
          if(units[cur].x == i && units[cur].y == j && units[cur].side == units[current_act_unit].side && units[cur].is_alive)
          {
            mask_innerhtml += '<img src = "assets/mask/can_get_reinforce.png" id = "' + i + '_' + j + '" onclick = "reinforce(' + cur + ')" class = "mask_img clickable_mask" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在施法范围内\n对此单位释放昆仑护体仙术">';
            flag = true;
            break;
          }
        }
        if(!flag)
        {
          mask_innerhtml += '<img src = "assets/mask/touchable.png" id ="' + i + '_' + j + '" class = "mask_img" onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')" title = "在施法范围内\n无法释放昆仑护体仙术:此单元格上没有友方单位">';
        }
      }
    }
  }
  document.getElementById("mask").innerHTML = mask_innerhtml;
  load_mask();
}

function selected_skip()
{
  document.getElementById("selected_box").innerHTML = '';
  document.getElementById("operation_hover_initial_mask").innerHTML = '';
  clear_operation_hover_mask();
  end_turn();
}