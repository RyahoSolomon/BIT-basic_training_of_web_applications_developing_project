class Commander
{
  //单位是由玩家还是AI操作
  constructor(){
  }
  get_command(id)
  {
    //传入game和被操作角色传出操作
    //被操作角色信息从 game.units[id] 中读取
    return this.command;
  }
}

class Player extends Commander
{
  //玩家类
  constructor(){
    super();
  }
  initial_UI(id)
  {
    //初始化用户操作界面
    //通过用户界面取得操作
    let operation_innerhtml = '';
    let operation_button_innerhtml = '';
    let operation_hover_initial_mask_innerhtml = '';
    operation_count = 0;
    for(let i = 0;i < units[id].skill_count; i++)
      {
        operation_count++;
        operation_button_innerhtml += '<img src = "assets/UI/button.png" id = "operation_button_' + i + '" >'
        switch(units[id].available_skills[i])
        {
          case "move":
            {
              if(have_moved)
              {
                operation_innerhtml += '<img src = "assets/UI/after_move.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" title =  "移动\n是否结束回合:否\n当前不可用 原因:本回合已移动过" style = "cursor: default">';
              }
              else{
                operation_innerhtml += '<img src = "assets/UI/move.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_move(current_act_unit)" title = "移动\n是否结束回合:否\n移动到移动范围内可以落脚的格子上.">';
              }
              break;
            }
          case "attack":
            {
              let icon_url = '';
              let hover_text = '普通攻击-';
              let additional_hover_text = '';
              switch(units[id].name)
              {
                case "yuanlan":
                  {
                    icon_url = "assets/UI/range_attack.png";
                    hover_text += '弓矢';
                    additional_hover_text += '\n最小攻击距离:' + units[id].min_range;
                    break;
                  }
                case "yedai":
                  {
                    icon_url = "assets/UI/magic_attack.png";
                    hover_text += '法术';
                    break;
                  }
                default:
                  {
                    icon_url = "assets/UI/attack.png";
                    hover_text += '近战'
                    break;
                  }
              }
              hover_text += ':\n是否结束回合:是\n最大攻击距离:' + units[id].max_range + additional_hover_text + "\n对攻击范围内的指定敌人造成伤害."
              operation_innerhtml += '<img src = "' + icon_url + '" id = "operation_' + i + '">';
              operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_attack(current_act_unit)" title = "' + hover_text + '">';
              break;
            }
          case "skip":
            {
              operation_innerhtml += '<img src = "assets/UI/skip.png" id = "operation_' + i + '">';
              operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_skip()" title = "结束回合\n是否结束回合:是">';
              break;
            }
          case "defend":
            {
              let hover_text = "举盾\n是否结束回合:是\n冷却:无\n举盾以进入防御状态,立刻增加";
              if(units[id].level >= 6)
              {
                hover_text += "6";
              }
              else
              {
                hover_text += "4";
              }
              hover_text += "点护甲上限并补满护甲,同时降低一点移动速度和一点攻击力";
              if(units[id].defending)
              {
                hover_text = "取消举盾\n是否结束回合:否\n冷却:无\n举盾以取消防御状态,恢复基础的最大护甲值、攻击力和移动速度.注意:取消举盾并不会结束回合.";
              }
              operation_innerhtml += '<img src = "assets/UI/defend.png" id = "operation_' + i + '">';
              operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_defend()" title = "' + hover_text + '">';
              break;
            }
          case "trap":
            {
              let skill_attack = parseInt(units[current_act_unit].attack * 1.5)
              let skill_range = units[current_act_unit].max_range;
              if(units[current_act_unit].level >= 6)
              {
                skill_range += 1;
                skill_attack += 3;
              }
              let hover_text = '陷阱\n是否结束回合:是\n冷却:' + units[current_act_unit].cooldown[0] + '\n剩余冷却:' + units[current_act_unit].current_cooldown[0] + '\n最大施法范围:' + skill_range + '\n使用后在指定地点放置一个捕兽夹陷阱,回合结束时站在上面的角色会被强制清除护盾,受到' + skill_attack + '点伤害并陷入流血效果.(流血效果:每回合结束时受到2点伤害)';
              if(units[current_act_unit].current_cooldown[0] > 0)
              {
                hover_text += '\n当前不可用 原因:冷却中';
                operation_innerhtml += '<img src = "assets/UI/trap_cooling.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" title = "' + hover_text + '" style = "cursor: default">';
              }
              else
              {
                operation_innerhtml += '<img src = "assets/UI/trap.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_trap()" title = "' + hover_text + '">';
              }
              break;
            }
          case "ice_storm":
            {
              let skill_range = units[current_act_unit].max_range + 3;
              let skill_attack = units[current_act_unit].attack - 1;
              if(units[current_act_unit].level >= 6)
              {
                skill_range += 1;
                skill_attack += 1;
              }
              let hover_text = '魔法风暴\n是否结束回合:是\n冷却:' + units[current_act_unit].cooldown[0] + '\n剩余冷却:' + units[current_act_unit].current_cooldown[0] + '\n最大施法范围:' + skill_range + '\n使用后以指定位置为中心生成一个5×5大小的魔法风暴,对区域内所有角色造成' + skill_attack + '点伤害.';
              if(units[current_act_unit].current_cooldown[0] > 0)
              {
                hover_text += '\n当前不可用 原因:冷却中';
                operation_innerhtml += '<img src = "assets/UI/ice_storm_cooling.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" title = "' + hover_text + '" style = "cursor: default">';
              }
              else
              {
                operation_innerhtml += '<img src = "assets/UI/ice_storm.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_ice_storm()" title = "' + hover_text + '">';
              }
              break;
            }
          case "whack":
            {
              let hover_text = '向死则生\n是否结束回合:是\n冷却:' + units[current_act_unit].cooldown[1] + '\n剩余冷却:' + units[current_act_unit].current_cooldown[1] + '\n最大施法范围:' + units[current_act_unit].max_range + '\n消耗自己2点生命,对目标发动强力攻击,清除对方当前一半的护甲值后,造成' + (units[current_act_unit].attack + 2) + '点伤害,并使对方流血.(流血效果:每回合结束时受到2点伤害)';
              if(units[current_act_unit].current_cooldown[1] > 0)
              {
                hover_text += '\n当前不可用 原因:冷却中';
                operation_innerhtml += '<img src = "assets/UI/whack_cooling.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" title = "' + hover_text + '" style = "cursor: default">';
              }
              else
              {
                operation_innerhtml += '<img src = "assets/UI/whack.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_whack()" title = "' + hover_text + '">';
              }
              break;
            }
          case "poison":
            {
              let hover_text = '秘法毒云\n是否结束回合:是\n冷却:' + units[current_act_unit].cooldown[1] + '\n剩余冷却:' + units[current_act_unit].current_cooldown[1] + '\n最大施法范围:' + units[current_act_unit].max_range + '\n向指定位置投放毒云,为以其为中心一定范围内的单位施加4层中毒效果.(中毒效果:每回合结束受到等同于层数的伤害,并减少一层层数)';
              if(units[current_act_unit].current_cooldown[1] > 0)
              {
                hover_text += '\n当前不可用 原因:冷却中';
                operation_innerhtml += '<img src = "assets/UI/poison_cooling.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" title = "' + hover_text + '" style = "cursor: default">';
              }
              else
              {
                operation_innerhtml += '<img src = "assets/UI/poison.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_poison()" title = "' + hover_text + '">';
              }
              break;
            }
          case "buff":
            {
              let hover_text = '昆仑护体仙术\n是否结束回合:是\n冷却:' + units[current_act_unit].cooldown[1] + '\n剩余冷却:' + units[current_act_unit].current_cooldown[1] + '\n最大施法范围:' + (units[current_act_unit].max_range + 2) + '\n为指定位置上的队友释放昆仑护体仙术,修复其全部护甲,恢复其2点生命,净化其所有负面效果,为其提供强化效果3回合(强化效果:持续时间内攻击和速度各加1)';
              if(units[current_act_unit].current_cooldown[1] > 0)
              {
                hover_text += '\n当前不可用 原因:冷却中';
                operation_innerhtml += '<img src = "assets/UI/buff_cooling.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" title = "' + hover_text + '" style = "cursor: default">';
              }
              else
              {
                operation_innerhtml += '<img src = "assets/UI/buff.png" id = "operation_' + i + '">';
                operation_hover_initial_mask_innerhtml += '<img src = "assets/mask/transparent_operation_mask.png" id = "operation_hover_initial_mask_' + i + '" onmouseenter = "load_operation_hover_mask(' + i + ')" onmouseleave = "clear_operation_hover_mask()" onclick = "selected_buff()" title = "' + hover_text + '">';
              }
              break;
            }
        }
      }
    document.getElementById("operations").innerHTML = operation_innerhtml;
    document.getElementById("operation_buttons").innerHTML = operation_button_innerhtml;
    document.getElementById("operation_hover_initial_mask").innerHTML = operation_hover_initial_mask_innerhtml;
    show_operations();
  }
  get_command(id)
  {

  }
}

class Computer extends Commander
{
  //玩家类
  constructor(){
    super();
  }
  get_command(id)
  {
  }
}