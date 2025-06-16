function computer_operate()
{
  if(units[current_act_unit].AI_type == "normal")
  {
    normal_AI();
    //console.log("行动结束!");
    units_display_update();
    load_items();
    initial_confirm();
    return;
  }
  else if(units[current_act_unit].AI_type == "wait")
  {
    wait_AI();
    //console.log("行动结束!");
    units_display_update();
    load_items();
    initial_confirm();
  }
}

function get_reachable_blocks(rx, ry, speed)
{
  //首先读取可到达的区域
  let reachable_blocks = new Queue;
  let result = new Array();
  reachable_blocks.push(new PointWithDistance(rx, ry, 0));
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
  vis[rx][ry] = true;
  while(!reachable_blocks.empty())
  {
    let current_block = reachable_blocks.top();
    //console.log("当前检测到(" + current_block.x + "," + current_block.y + ") 距离为" + current_block.distance)
    if(current_block.distance >= speed)
    {
      break;
    }
    if(current_block.x + 1 < height)
    {
      let cx = current_block.x + 1;
      let cy = current_block.y;
      //console.log(vis[cx][cy]);
      //console.log(is_block_reachable(cx,cy));
      //console.log(map[cx][cy]);
      if(!vis[cx][cy] && is_block_reachable(cx, cy))
      {
        let flag = false;
        for(let i = 0; i < units_count; i++)
        {
          if(units[i].is_alive && units[i].x == cx && units[i].y == cy)
          {
            flag = true;
            vis[cx][cy] = true;
            if(units[i].side == units[current_act_unit].side)
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
          result.push(new PointWithDistance(cx, cy, current_block.distance));
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
            if(units[i].side == units[current_act_unit].side)
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
          result.push(new PointWithDistance(cx, cy, current_block.distance));
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
            if(units[i].side == units[current_act_unit].side)
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
          result.push(new PointWithDistance(cx, cy, current_block.distance));
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
            if(units[i].side == units[current_act_unit].side)
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
          result.push(new PointWithDistance(cx, cy, current_block.distance));
        }
      }
    }
    reachable_blocks.pop();
  }
  return result;
}

function get_distance_info(reachable_blocks, max_range, min_range, launcher_side)
{
  let blocks_can_attack = new Array();
  let blocks_only_move = new Array();
  let vis = new Array();
  for(let i = 0; i < height; i++)
  {
    vis[i] = new Array();
  }
  for(let i = 0; i < reachable_blocks.length; i++)
  {
    let distance_to_nearest_enemy = 1000;
    let nearest_enemy_id = -1;
    let nearest_inrange_enemy_id = -1;
    let distance_to_nearest_inrange_enemy = 1000;
    let rx = reachable_blocks[i].x;
    let ry = reachable_blocks[i].y;
    let inrange_blocks = new Queue();
    inrange_blocks.push(new PointWithDistance(rx, ry, 0));
    for(let i = 0; i < height; i++)
    {
      for(let j = 0; j < width; j++)
      {
        vis[i][j] = false;
      }
    }
    vis[rx][ry] = true;
    //console.log("开始检测移动到(" + rx + "," + ry + ")上的情况.");
    while(!inrange_blocks.empty())
    {
      let current_block = inrange_blocks.top();
      inrange_blocks.pop();
      let possible_target = is_designated_side_unit_on(current_block.x, current_block.y, switch_side(launcher_side));
      let can_continue_to_move = true;
      if(possible_target != -1)
      {
        //console.log("当前查看格子:", current_block);
        //console.log("这个格子上有敌方单位!距离发起点:" + current_block.distance);
        can_continue_to_move = false;
        if(current_block.distance < distance_to_nearest_enemy)
        {
          distance_to_nearest_enemy = current_block.distance;
          nearest_enemy_id = possible_target;
        }
        let distance_to_attack_target_tried = manhattan_distance_cal(current_block.x, current_block.y, rx, ry);
        if(distance_to_attack_target_tried <= max_range && distance_to_attack_target_tried >= min_range)
        {
          if(distance_to_nearest_inrange_enemy > distance_to_attack_target_tried)
          {
            //console.log("更新最近可攻击单位!更新前距离:" + distance_to_nearest_inrange_enemy);
            nearest_inrange_enemy_id = possible_target;
            distance_to_nearest_inrange_enemy = distance_to_attack_target_tried;
            //console.log("更新后距离:" + distance_to_nearest_inrange_enemy);
            //console.log("尝试攻击单位名字:" + units[possible_target].name_cn);
            //console.log("尝试攻击单位id:" + possible_target + " 更新后尝试攻击单位的id:" + nearest_enemy_id);
          }
        }
      }
      if(can_continue_to_move && current_block.x + 1 < height)
      {
        let cx = current_block.x + 1;
        let cy = current_block.y;
        //console.log("正在排查(" + cx + "," + cy + ")的情况!");
        if(!vis[cx][cy] && is_block_reachable(cx, cy))
        {
          vis[cx][cy] = true;
          inrange_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
        }
      }
      if(can_continue_to_move && current_block.x - 1 >= 0)
      {
        let cx = current_block.x - 1;
        let cy = current_block.y;
        //console.log("正在排查(" + cx + "," + cy + ")的情况!");
        if(!vis[cx][cy] && is_block_reachable(cx, cy))
        {
          vis[cx][cy] = true;
          inrange_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
        }
      }
      if(can_continue_to_move && current_block.y + 1 < width)
      {
        let cx = current_block.x;
        let cy = current_block.y + 1;
        //console.log("正在排查(" + cx + "," + cy + ")的情况!");
        if(!vis[cx][cy] && is_block_reachable(cx, cy))
        {
          vis[cx][cy] = true;
          inrange_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
        }
      }
      if(can_continue_to_move && current_block.y - 1 >= 0)
      {
        let cx = current_block.x;
        let cy = current_block.y - 1;
        //console.log("正在排查(" + cx + "," + cy + ")的情况!");
        if(!vis[cx][cy] && is_block_reachable(cx, cy))
        {
          vis[cx][cy] = true;
          inrange_blocks.push(new PointWithDistance(cx, cy, current_block.distance + 1));
        }
      }
    }
    if(nearest_inrange_enemy_id != -1)
    {
      blocks_can_attack.push(new PointWithDistanceAndTarget(reachable_blocks[i].x, reachable_blocks[i].y, 0,nearest_inrange_enemy_id, distance_to_nearest_enemy));
    }
    else
    {
      blocks_only_move.push(new PointWithDistance(reachable_blocks[i].x, reachable_blocks[i].y, distance_to_nearest_enemy));
    }
  }
  let distance_limit = -1;
  let best_attack_pos_count = 0;
  let best_move_pos_count = 0;
  if(blocks_can_attack.length > 0)
  {
    blocks_can_attack.sort(function(a, b){return (b.distance - a.distance)});
    distance_limit = blocks_can_attack[0].distance;
    for(let cur = 0; cur < blocks_can_attack.length; cur++)
    {
      if(distance_limit == blocks_can_attack[cur].distance)
      {
        best_attack_pos_count++;
      }
      else
      {
        break;
      }
    }
  }
  if(blocks_only_move.length > 0)
  {
    blocks_only_move.sort(function(a, b){return (a.distance - b.distance)});
    distance_limit = blocks_only_move[0].distance;
    for(let cur = 0; cur < blocks_only_move.length; cur++)
    {
      if(distance_limit == blocks_only_move[cur].distance)
      {
        best_move_pos_count++;
      }
      else
      {
        break;
      }
    }
  }
  return [[blocks_can_attack, blocks_only_move],[best_attack_pos_count, best_move_pos_count]];
}

function normal_AI()
{
  let reachable_blocks = get_reachable_blocks(units[current_act_unit].x, units[current_act_unit].y, units[current_act_unit].speed);
  //console.log(reachable_blocks);
  let reachable_blocks_info = get_distance_info(reachable_blocks, units[current_act_unit].max_range, units[current_act_unit].min_range, units[current_act_unit].side);
  //console.log(reachable_blocks_info);
  if(reachable_blocks_info[1][0] != 0)
  {
    //可以攻击,执行
    let attack_pos_id = 0;
    if(reachable_blocks_info[1][0] > 1)
    {
      attack_pos_id = Math.floor(Math.random() * reachable_blocks_info[1][0]);
    }
    document.getElementById("selected_box").innerHTML = '<img src = assets/mask/selected.png id = "move_from_mark">';
    let move_from_mark = document.getElementById("move_from_mark");
    move_from_mark.style.position = "absolute";
    move_from_mark.style.top = units[current_act_unit].x * 64 - 720;
    move_from_mark.style.left = units[current_act_unit].y * 64;
    units[current_act_unit].x = reachable_blocks_info[0][0][attack_pos_id].x;
    units[current_act_unit].y = reachable_blocks_info[0][0][attack_pos_id].y;
    document.getElementById("selected_box").innerHTML += '<img src = assets/mask/selected.png id = "move_to_mark">';
    let move_to_mark = document.getElementById("move_to_mark");
    move_to_mark.style.position = "absolute";
    move_to_mark.style.top = units[current_act_unit].x * 64 - 720;
    move_to_mark.style.left = units[current_act_unit].y * 64;
    units[reachable_blocks_info[0][0][attack_pos_id].target].get_hurt(units[current_act_unit].attack, current_act_unit);
    document.getElementById("selected_box").innerHTML += '<img src = assets/mask/computer_attack_target.png id = "attack_target_mark">';
    let attack_target_mark = document.getElementById("attack_target_mark");
    attack_target_mark.style.position = "absolute";
    attack_target_mark.style.top = units[reachable_blocks_info[0][0][attack_pos_id].target].x * 64 - 720;
    attack_target_mark.style.left = units[reachable_blocks_info[0][0][attack_pos_id].target].y * 64;
    //sleep(300);
  }
  else if(reachable_blocks_info[1][1] != 0)
  {
    //可以移动,执行
    let movable_pos_id = 0;
    if(reachable_blocks_info[1][1] > 1)
    {
      movable_pos_id = Math.floor(Math.random() * reachable_blocks_info[1][1]);
    }
    document.getElementById("selected_box").innerHTML = '<img src = assets/mask/selected.png id = "move_from_mark">';
    document.getElementById("selected_box").innerHTML += '<img src = assets/mask/selected.png id = "move_to_mark">';
    let move_from_mark = document.getElementById("move_from_mark");
    move_from_mark.style.position = "absolute";
    move_from_mark.style.top = units[current_act_unit].x * 64 - 720;
    move_from_mark.style.left = units[current_act_unit].y * 64;
    units[current_act_unit].x = reachable_blocks_info[0][1][movable_pos_id].x;
    units[current_act_unit].y = reachable_blocks_info[0][1][movable_pos_id].y;
    let move_to_mark = document.getElementById("move_to_mark");
    move_to_mark.style.position = "absolute";
    move_to_mark.style.top = units[current_act_unit].x * 64 - 720;
    move_to_mark.style.left = units[current_act_unit].y * 64;
  }
  else
  {
    document.getElementById("selected_box").innerHTML = '<img src = assets/mask/selected.png id = "move_from_mark">';
    let move_from_mark = document.getElementById("move_from_mark");
    move_from_mark.style.position = "absolute";
    move_from_mark.style.top = units[current_act_unit].x * 64 - 720;
    move_from_mark.style.left = units[current_act_unit].y * 64;
  }
  
  units_display_update();
  load_items();

  //这是非BFS驱动的AI系统 现已弃用
  // for(let i = 0; i < height; i++)
  // {
  //   reachable_blocks[i] = new Array();
  //   for(let j = 0; j < width; j++)
  //   {
  //     let reachable = true;
  //     if(map[i][j] == 11 || map[i][j] == 18 || map[i][j] == 17 || map[i][j] == 16)
  //     {
  //       reachable = false;
  //     }
  //     else if(manhattan_distance_cal(i,j,units[current_act_unit].x,units[current_act_unit].y) > units[current_act_unit].speed)
  //     {
  //       reachable = false;
  //     }
  //     else 
  //     {
  //       for(let cur = 0; cur < units_count; cur++)
  //       {
  //         if(units[cur].x == i && units[cur].y == j && units[cur].is_alive)
  //         {
  //           reachable = false;
  //         }
  //       }
  //     }
  //     reachable_blocks[i][j] = reachable;
  //     //从可到达的区域查看是否能够攻击到人,如果能,则移动并攻击
  //     if(reachable)
  //     {
  //       for(let cx = 0; cx < height; cx++)
  //       {
  //         for(let cy = 0; cy < width; cy++)
  //         {
  //           let distance = manhattan_distance_cal(cx,cy,i,j);
  //           if(distance >= units[current_act_unit].min_range && distance <= units[current_act_unit].max_range)
  //           {
  //             for(let cur = 0; cur < units_count; cur++)
  //             {
  //               if(units[cur].side != units[current_act_unit].side && units[cur].x == cx && units[cur].y == cy && units[cur].is_alive)
  //               {
  //                 //检测到目标,攻击 
  //                 document.getElementById("selected_box").innerHTML = '<img src = assets/mask/selected.png id = "move_from_mark">';
  //                 let move_from_mark = document.getElementById("move_from_mark");
  //                 move_from_mark.style.position = "absolute";
  //                 move_from_mark.style.top = units[current_act_unit].x * 64 - 720;
  //                 move_from_mark.style.left = units[current_act_unit].y * 64;
  //                 units[current_act_unit].x = i;
  //                 units[current_act_unit].y = j;
  //                 document.getElementById("selected_box").innerHTML += '<img src = assets/mask/selected.png id = "move_to_mark">';
  //                 let move_to_mark = document.getElementById("move_to_mark");
  //                 move_to_mark.style.position = "absolute";
  //                 move_to_mark.style.top = i * 64 - 720;
  //                 move_to_mark.style.left = j * 64;
  //                 units[cur].get_hurt(units[current_act_unit].attack);
  //                 document.getElementById("selected_box").innerHTML += '<img src = assets/mask/computer_attack_target.png id = "attack_target_mark">';
  //                 let attack_target_mark = document.getElementById("attack_target_mark");
  //                 attack_target_mark.style.position = "absolute";
  //                 attack_target_mark.style.top = units[cur].x * 64 - 720;
  //                 attack_target_mark.style.left = units[cur].y * 64;
  //                 //sleep(300);
  //                 return;
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
  // //没有找到移动后可以攻击到的敌人,仅移动
  // let reachable_pos = new Array();
  // for(let i = 0; i < height; i++)
  // {
  //   for(let j = 0; j < width; j++)
  //   {
  //     if(reachable_blocks[i][j])
  //     {
  //       let min_distance = 1000;
  //       for(let cur = 0; cur < units_count; cur++)
  //       {
  //         if(units[cur].side != units[current_act_unit].side && units[cur].is_alive)
  //         {
  //           min_distance = Math.min(min_distance,manhattan_distance_cal(i, j, units[cur].x, units[cur].y));
  //         }
  //       }
  //       let temp = new PointWithDistance();
  //       temp.distance = min_distance;
  //       temp.x = i;
  //       temp.y = j;
  //       reachable_pos.push(temp);
  //     }
  //   }
  // }
  // document.getElementById("selected_box").innerHTML = '<img src = assets/mask/selected.png id = "move_from_mark">';
  // document.getElementById("selected_box").innerHTML += '<img src = assets/mask/selected.png id = "move_to_mark">';
  // let move_from_mark = document.getElementById("move_from_mark");
  // move_from_mark.style.position = "absolute";
  // move_from_mark.style.top = units[current_act_unit].x * 64 - 720;
  // move_from_mark.style.left = units[current_act_unit].y * 64;
  // reachable_pos.sort(function(a, b){return a.distance - b.distance});
  // for(let i = 0; i < reachable_pos.length; i++)
  // {
  //   //console.log("目标位置:(" + reachable_pos[i].x + "," + reachable_pos[i].y + ') 距敌人距离:' + reachable_pos[i].distance )
  // }
  // if(reachable_pos.length > 0)
  // {
  //   units[current_act_unit].x = reachable_pos[0].x;
  //   units[current_act_unit].y = reachable_pos[0].y;
  // }
  // let move_to_mark = document.getElementById("move_to_mark");
  // move_to_mark.style.position = "absolute";
  // move_to_mark.style.top = units[current_act_unit].x * 64 - 720;
  // move_to_mark.style.left = units[current_act_unit].y * 64;
  // units_display_update();
  // load_items();
  // //sleep(300);
}

function wait_AI()
{
  document.getElementById("selected_box").innerHTML = '<img src = assets/mask/selected.png id = "move_from_mark">';
  let move_from_mark = document.getElementById("move_from_mark");
  move_from_mark.style.position = "absolute";
  move_from_mark.style.top = units[current_act_unit].x * 64 - 720;
  move_from_mark.style.left = units[current_act_unit].y * 64;
  units_display_update();
  load_items();
}