function load_hover_mask(i, j)
{
  //console.log("鼠标移入(" + i + ',' + j + ')');
  document.getElementById("hover_mask").innerHTML = '<img src = "assets/mask/block_hover.png" id = "block_hover_mask">';
  document.getElementById("block_hover_mask").style.position = "absolute";
  document.getElementById("block_hover_mask").style.left = j * 64;
  document.getElementById("block_hover_mask").style.top = i * 64 - 720;
}

function delete_hover_mask(i, j)
{
  document.getElementById("hover_mask").innerHTML = '';
  //console.log("鼠标移出(" + i + ',' + j + ')');
}

function load_operation_hover_mask(i)
{
  document.getElementById("hover_mask").innerHTML = '<img src = "assets/mask/operation_hover_mask.png" id = "operation_hover_mask" height = "96" width = "96">';
  let operation_hover_mask = document.getElementById("operation_hover_mask");
  operation_hover_mask.style.position = "absolute";
  operation_hover_mask.style.left = 24 + 120 * i;
  operation_hover_mask.style.top = -144 + 24;
}

function clear_operation_hover_mask()
{
  document.getElementById("hover_mask").innerHTML = '';
}

function clear_mission_icons()
{
  document.getElementById("mission_confirm_masks").innerHTML = '';
  document.getElementById("mission_icons").innerHTML = '';
  document.getElementById("mission_hover_mask").innerHTML = '';
}

function clear_mission_hover_mask()
{
  document.getElementById("mission_hover_mask").innerHTML = '';
}

function clear_achievement_icons()
{
  document.getElementById("achievement_popup").innerHTML = '';
  document.getElementById("achievement_confirm_mask").innerHTML = '';
  document.getElementById("achievement_confirm_hover_mask").innerHTML = '';
}

function load_achievement_hover_mask()
{
  document.getElementById("achievement_confirm_hover_mask").innerHTML = '<img src = "assets/mask/confirm_hover_mask.png" id = "achievement_confirm_button_hover_mask">'; 
}

function clear_achievement_hover_mask()
{
  document.getElementById("achievement_confirm_hover_mask").innerHTML = '';
}


function load_dialogue_hover_mask(id)
{
  console.log("正常");
  document.getElementById("plot_option_hover_masks").innerHTML = '<img src = "assets/mask/dialogue_option_hover_mask.png" id = "plot_option_hover_mask">'; 
  if(id == 0)
  {
    document.getElementById("plot_option_hover_mask").style.top = "-625px";
  }
  else
  {
    document.getElementById("plot_option_hover_mask").style.top = "-425px";
  }
}

function clear_dialogue_hover_mask()
{
  document.getElementById("plot_option_hover_masks").innerHTML = '';
}


function load_mission_hover_mask()
{
  document.getElementById("mission_hover_mask").innerHTML = '<img src = "assets/mask/mission_confirm_hover_mask.png" id = "mission_confirm_hover_mask">'; 
}

function load_skip_game_hover_mask()
{
  document.getElementById("other_buttons_hover_mask").innerHTML = '<img src = "assets/mask/other_button_hover_mask.png" id = "skip_game_hover_mask">';
}

function load_guide_hover_mask()
{
  document.getElementById("other_buttons_hover_mask").innerHTML = '<img src = "assets/mask/other_button_hover_mask.png" id = "guide_hover_mask">';
}

function reset_other_buttons_hover_mask()
{
  document.getElementById("other_buttons_hover_mask").innerHTML = '';
}

function load_magic_storm_hover_mask(cx, cy)
{
  let hover_mask_innerhtml = '';
  for(let i = cx - 2; i <= cx + 2; i++)
  {
    for(let j = cy - 2; j <= cy + 2; j++)
    {
      if(i >= 0 && i < height && j >= 0 && j < width)
      {
        if(is_unit_on(i, j))
        {
          hover_mask_innerhtml += '<img src = "assets/mask/can_attack.png" class = "magic_storm_mask" id = "' + i + '_' + j +'">';
        }
        else
        {
          hover_mask_innerhtml += '<img src = "assets/mask/magic_storm.png" class = "magic_storm_mask" id = "' + i + '_' + j +'">';
        }
      }
    }
  }
  document.getElementById("hover_mask").innerHTML = hover_mask_innerhtml;
  let magic_storm_masks = document.getElementsByClassName("magic_storm_mask");
  for(let cur = 0; cur < magic_storm_masks.length; cur++)
  {
    let pos = magic_storm_masks[cur].id.split('_');
    magic_storm_masks[cur].style.position = "absolute";
    magic_storm_masks[cur].style.left = pos[1] * 64 + "px";
    magic_storm_masks[cur].style.top = pos[0] * 64 - 720 + "px";
  }
}

function load_control_button_hover_mask(id)
{
  document.getElementById("other_buttons_hover_mask").innerHTML = '<img src = "assets/mask/control_button_hover_mask.png" id = "control_button_hover_mask">';
  document.getElementById("control_button_hover_mask").style.position = "absolute";
  document.getElementById("control_button_hover_mask").style.left = 1140 + (id * 43) + "px";
  document.getElementById("control_button_hover_mask").style.top = "-47px";
}

function load_poison_hover_mask(cx, cy)
{
  let hover_mask_innerhtml = '';
  for(let i = cx - 2; i <= cx + 2; i++)
  {
    for(let j = cy - 2; j <= cy + 2; j++)
    {
      if(manhattan_distance_cal(cx, cy, i, j) > 2)
      {
        continue;
      }
      if(i >= 0 && i < height && j >= 0 && j < width)
      {
        hover_mask_innerhtml += '<img src = "assets/mask/poison_range_mask.png" class = "poison_range_mask" id = "' + i + '_' + j +'">';
      }
    }
  }
  document.getElementById("hover_mask").innerHTML = hover_mask_innerhtml;
  let magic_storm_masks = document.getElementsByClassName("poison_range_mask");
  for(let cur = 0; cur < magic_storm_masks.length; cur++)
  {
    let pos = magic_storm_masks[cur].id.split('_');
    magic_storm_masks[cur].style.position = "absolute";
    magic_storm_masks[cur].style.left = pos[1] * 64 + "px";
    magic_storm_masks[cur].style.top = pos[0] * 64 - 720 + "px";
  }
}