function click_block(i,j)
{
  //console.log("点击("+i+','+j+')');
  if(selected_operation == '')
  {
    return;
  }
  if(selected_operation == 'move')
  {
    if(manhattan_distance_cal(i,j,units[current_act_unit].x,units[current_act_unit].y) <= units[current_act_unit].speed)
    {
      have_moved = true;
      units[current_act_unit].x = i;
      units[current_act_unit].y = j;
      selected_operation = "";
      units_display_update();
      load_items();
      document.getElementById("operation_hover_initial_mask").innerHTML = '';
      clear_operation_hover_mask();
      units[current_act_unit].commander.initial_UI(current_act_unit);
      selected_box_update();
      reset_mask();
      return;
    }
    return;
  }
  if(selected_operation == 'attack')
  {
    //console.log("lalala");
    for(let cur = 0; cur < units_count; cur++)
    {
      if(units[cur].x == i && units[cur].y == j && units[cur].is_alive)
      {
        units[cur].get_hurt(units[current_act_unit].attack, current_act_unit);
        selected_operation = "";
        units_display_update();
        load_items();
        reset_mask();
        document.getElementById("operation_hover_initial_mask").innerHTML = '';
        clear_operation_hover_mask();
        end_turn();
      }
    }
  }
}

function place_trap_on(cx, cy, attack)
{
  let temp = new Trap(attack, current_act_unit);
  temp.x = cx;
  temp.y = cy;
  items.push(temp);
  units[current_act_unit].current_cooldown[0] = units[current_act_unit].cooldown[0];
  units_display_update();
  reset_mask();
  load_items();
  clear_operation_hover_mask();
  end_turn();
}

function use_ice_storm(cx, cy, damage)
{
  for(let i = cx - 2; i <= cx + 2; i++)
  {
    for(let j = cy - 2; j <= cy + 2; j ++)
    {
      if(i < 0 || i > height || j <0  || j>width)
      {
        continue;
      }
      for(let cur = 0; cur < units_count; cur++)
      {
        if(units[cur].x == i && units[cur].y == j && units[cur].is_alive)
        {
          //console.log("受伤:" + cur);
          units[cur].get_hurt(damage, current_act_unit);
        }
      }
    }
  }
  units[current_act_unit].current_cooldown[0] = units[current_act_unit].cooldown[0];
  units_display_update();
  reset_mask();
  load_items();
  clear_operation_hover_mask();
  end_turn();
}

function whack(cx, cy, damage)
{
  for(let cur = 0; cur < units_count; cur++)
  {
    if(units[cur].x == cx && units[cur].y == cy && units[cur].is_alive)
    {
      units[current_act_unit].health -= 2;
      units[current_act_unit].get_hurt(0);
      units[cur].armor = 0;
      units[cur].blooding = true;
      units[cur].get_hurt(damage, current_act_unit);
      selected_operation = "";
      units[current_act_unit].current_cooldown[1] = units[current_act_unit].cooldown[1];
      units_display_update();
      load_items();
      reset_mask();
      document.getElementById("operation_hover_initial_mask").innerHTML = '';
      clear_operation_hover_mask();
      end_turn();
    }
  }
}

function poison_cloud(cx, cy, damage)
{
  for(let i = cx - 2; i <= cx + 2; i++)
  {
    for(let j = cy - 2; j <= cy + 2; j ++)
    {
      if(i < 0 || i > height || j < 0  || j > width)
      {
        continue;
      }
      if(manhattan_distance_cal(cx, cy, i ,j) > 2)
      {
        continue;
      }
      for(let cur = 0; cur < units_count; cur++)
      {
        if(units[cur].x == i && units[cur].y == j && units[cur].is_alive)
        {
          //console.log("受伤:" + cur);
          units[cur].poison += 4;
        }
      }
    }
  }
  units[current_act_unit].current_cooldown[1] = units[current_act_unit].cooldown[1];
  units_display_update();
  reset_mask();
  load_items();
  clear_operation_hover_mask();
  end_turn();
}

function reinforce(target)
{
  units[target].armor = units[target].max_armor;
  units[target].blooding = false;
  units[target].poison = false;
  units[target].health += 2;
  if(units[target].health > units[target].max_health)
  {
    units[target].health = units[target].max_health;
  }
  units[target].reinforce += 5;
  units[target].attack += 1;
  units[target].speed += 1;
  selected_operation = "";
  units[current_act_unit].current_cooldown[1] = units[current_act_unit].cooldown[1];
  units_display_update();
  load_items();
  reset_mask();
  document.getElementById("operation_hover_initial_mask").innerHTML = '';
  clear_operation_hover_mask();
  end_turn();
}