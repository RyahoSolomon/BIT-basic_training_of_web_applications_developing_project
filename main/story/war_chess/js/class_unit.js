class Unit
{
  constructor(uuid)
  {
    this.name = "";
    //经验 玩家角色经验用作计算升级 电脑角色经验用作被击杀后击杀者获得滴经验
    this.exp = 0;
    //中毒:每回合结束收到等同于等级的伤害并减少一层层数
    this.poison = 0;
    //强化:攻击伤害、移动速度各加一
    this.reinforce = 0;
    //流血:每回合结束受到点伤害
    this.blooding = false;
    /*唯一id,用于识别角色*/
    this.uuid = uuid;
    this.defending = false;
    //定义阵营,0是队友,1是对手
    this.side = 0;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 5;
    /* max_health定义最大生命值 */
    this.max_health = 5;
    /* health定义当前生命值 */
    this.health = 5;
    /* max_armor 定义最大护甲 */
    this.max_armor = 3;
    /* armor 定义护甲 */
    this.armor = 3;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 1;
    this.max_range = 1;
    /* 定义坐标 */
    this.x = 0;
    this.y = 0;
    //是否存活
    this.is_alive = true;
    //操作者;
    //图片位置
    this.icon = "";
  }
  availiable()
  {
    if(this.is_alive == 0)
    {
      return false;
    }
    else 
    {
      return true;
    }
  }
  act()
  {
    if(this.availiable())
    {
      return this.get_command();
    }
    return new Command();
  }
  get_command()
  {
    var command = this.commander.get_command(this.uuid);
    //在这里获得玩家/AI操作
    //传入game,返回操作
    return command;
  }
  get_hurt(hurt, launcher_id)
  {
    let rest_hurt = 0;
    rest_hurt = hurt - this.armor;
    if(rest_hurt < 0)
    {
      rest_hurt = 0;
    }
    this.armor -= hurt;
    if(this.armor < 0)
    {
      this.armor = 0;
    }
    this.health -= rest_hurt;
    if(this.health <= 0)
    {
      this.health = 0;
      this.is_alive = false;
      if(this.name == "spirit")
      {
        spirit_count++;
      }
      if(launcher_id != null && this.side == 1 && this.side != units[launcher_id].side && units[launcher_id].commander_type == "player")
      {
        units[launcher_id].exp += this.exp;
        level_up(launcher_id);
        for(let cur = 0; cur < units_count; cur++)
        {
          if(cur != launcher_id && units[cur].commander_type == "player" && units[cur].is_alive)
          {
            units[cur].exp += Math.floor(this.exp / 4);
            level_up(cur);
          }
        }
      }
      if(this.side == 0)
      {
        announcement_list.push("[第" + round + "回合]" + this.name_cn + "在战场上陨落了");load_annoucement();
        if(achievements.ach3 == false && this.commander_type == "player" && this.name == "yedai" && launcher_id != null)
        {
          if(units[launcher_id].commander_type == "player")
          {
            if(units[launcher_id].name == "yuanlan" || units[launcher_id].name == "user")
            {   
              console.log("成就解锁");
              achievement_popup(2, "");
              achievements.ach3 = true;
              localStorage.setItem(username + "achievement", JSON.stringify(achievements));
            }
          }
        }
      }
      return true;
    }
    return false;
  }
}

class PlayerUnit extends Unit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "";
    this.name_cn = "未定义名字";
    this.commander_type = "player";
    this.level = 0;
    this.commander = new Player();
    this.cooldown = new Array();
    this.current_cooldown = new Array();
    this.current_cooldown[0] = 0;
    this.current_cooldown[1] = 0;
  }
}

class ComputerUnit extends Unit
{
  constructor(uuid)
  {
    super(uuid);
    this.commander_type = "computer";
    this.AI_type = "normal";
    this.commander = new Computer();
  }
}

class Protagonist extends PlayerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "user";
    this.name_cn = username;
    //level:等级
    this.level = user_level.level;
    //经验
    this.exp = user_level.exp;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 3;
    /* max_health定义最大生命值 */
    this.max_health = 6;
    /* health定义当前生命值 */
    this.health = 6;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    this.icon = "assets/unit/protagonist_male.png";
    this.skill_count = 4;
    this.available_skills = new Array();
    this.cooldown[0] = 0;
    this.cooldown[1] = 4;
    this.available_skills[0] = "move";
    this.available_skills[1] = "attack";
    this.available_skills.push("defend");
    if(this.level >= 2)
    {
      this.max_health += 2;
      this.health += 2;
      this.max_armor += 1;
      this.armor += 1;
    }
    if(this.level >= 3)
    {
      this.max_armor += 1;
      this.armor += 1;
      this.max_health += 2;
      this.health += 2;
    }
    if(this.level >= 4)
    {
      this.available_skills.push("whack")
      this.skill_count++;
      this.speed += 1;
    }
    if(this.level >= 5)
    {
      this.max_armor += 1;
      this.armor += 1;
      this.max_health += 2;
      this.health += 2;
    }
    
    if(this.level >= 5)
      {
        this.attack += 1;
        this.max_health += 1;
        this.health += 1;
      }
    this.available_skills.push("skip");
  }
}

class YuanLan extends PlayerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "yuanlan";
    this.name_cn = "鸢阑";
    //level:等级
    this.level = yuanlan_level.level;
    //经验
    this.exp = yuanlan_level.exp;
    /* attack定义基础攻击力 */
    this.attack = 4;
    /* speed定义移动速度 */
    this.speed = 5;
    /* max_health定义最大生命值 */
    this.max_health = 4;
    /* health定义当前生命值 */
    this.health = 4;
    this.min_range = 3;
    this.max_range = 5;
    /* max_armor 定义最大护甲 */
    this.max_armor = 1;
    /* armor 定义护甲 */
    this.armor = 1;
    this.icon = "assets/unit/yuanlan.png";
    this.skill_count = 4;
    this.available_skills = new Array();
    this.available_skills[0] = "move";
    this.available_skills[1] = "attack";
    this.available_skills[2] = "trap";
    this.cooldown[0] = 6;
    this.cooldown[1] = 3;
    if(this.level >= 2)
    {
      this.max_health += 2;
      this.health += 2;
      this.speed++;
    }
    if(this.level >= 3)
    {
      this.min_range--;
      this.attack ++;
    }
    if(this.level >= 4)
    {
      this.available_skills.push("poison")
      this.skill_count++;
      this.armor += 1;
      this.max_armor += 1;
    }
    if(this.level >= 5)
    {
      this.max_range += 1;
      this.attack += 1;
    }
    if(this.level >= 6)
    {
      this.max_health += 2;
      this.health += 2;
    }
    this.available_skills.push("skip");
  }
}

class YeDai extends PlayerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "yedai";
    this.name_cn = "叶岱";
    //level:等级
    this.level = yedai_level.level;
    //经验
    this.exp = yedai_level.exp;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 4;
    /* max_health定义最大生命值 */
    this.max_health = 4;
    /* health定义当前生命值 */
    this.health = 4;
    /* max_armor 定义最大护甲 */
    this.max_armor = 0;
    this.min_range = 1;
    this.max_range = 3;
    /* armor 定义护甲 */
    this.armor = 0;
    this.icon = "assets/unit/yedai.png";
    this.skill_count = 4;
    this.available_skills = new Array();
    this.available_skills[0] = "move";
    this.available_skills[1] = "attack";
    this.available_skills[2] = "ice_storm";
    this.cooldown[0] = 4;
    this.cooldown[1] = 4;
    if(this.level >= 2)
    {
      this.armor += 2;
      this.max_armor += 2;
      this.speed += 1;
    }
    if(this.level >= 3)
    {
      this.max_range += 1;
      this.health += 2;
      this.max_health += 2;
    }
    if(this.level >= 4)
    {
      this.available_skills.push("buff")
      this.skill_count++;
      this.attack += 1;
    }
    if(this.level >= 5)
    {
      this.max_health += 2;
      this.health += 2;
      this.max_armor += 1;
      this.armor += 1;
    }
    if(this.level >= 6)
    {
      this.attack += 1;
      this.max_armor += 1;
      this.armor += 1;
    }
    this.available_skills.push("skip");
  }
}

class Ghoul extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 6;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 2;
    /* speed定义移动速度 */
    this.speed = 3;
    /* max_health定义最大生命值 */
    this.max_health = 4;
    /* health定义当前生命值 */
    this.health = 4;
    /* max_armor 定义最大护甲 */
    this.max_armor = 1;
    /* armor 定义护甲 */
    this.armor = 1;
    //图片位置
    this.icon = "assets/unit/ghoul.png";
    this.name_cn = "伥鬼";
  }
}

class Goblin extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 5;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 2;
    /* speed定义移动速度 */
    this.speed = 4;
    /* max_health定义最大生命值 */
    this.max_health = 3;
    /* health定义当前生命值 */
    this.health = 3;
    /* max_armor 定义最大护甲 */
    this.max_armor = 0;
    /* armor 定义护甲 */
    this.armor = 0;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 2;
    this.max_range = 2;
    //操作者
    this.commander = new Computer();
    //图片位置
    this.icon = "assets/unit/yayu.png";
    this.name_cn = "窫窳";
  }
}

class Fay extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 9;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 5;
    /* max_health定义最大生命值 */
    this.max_health = 5;
    /* health定义当前生命值 */
    this.health = 5;
    /* max_armor 定义最大护甲 */
    this.max_armor = 0;
    /* armor 定义护甲 */
    this.armor = 0;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 1;
    this.max_range = 3;
    //操作者
    this.commander = new Computer();
    //图片位置
    this.icon = "assets/unit/fay.png";
    this.name_cn = "妖族战士";
  }
}

class FaySupervision extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 25;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 6;
    /* max_health定义最大生命值 */
    this.max_health = 10;
    /* health定义当前生命值 */
    this.health = 10;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 0;
    this.max_range = 4;
    //操作者
    this.commander = new Computer();
    //图片位置
    this.icon = "assets/unit/fay_supervision.png";
    this.name_cn = "妖族坚果";
  }
}

class Alghoul extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 14;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 4;
    /* speed定义移动速度 */
    this.speed = 3;
    /* max_health定义最大生命值 */
    this.max_health = 6;
    /* health定义当前生命值 */
    this.health = 6;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    //图片位置
    this.icon = "assets/unit/alghoul.png";
    this.name_cn = "恶鬼";
  }
}

class GiantGoblin extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 12;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 5;
    /* max_health定义最大生命值 */
    this.max_health = 5;
    /* health定义当前生命值 */
    this.health = 5;
    /* max_armor 定义最大护甲 */
    this.max_armor = 1;
    /* armor 定义护甲 */
    this.armor = 1;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 2;
    this.max_range = 4;
    //操作者
    this.commander = new Computer();
    //图片位置
    this.icon = "assets/unit/fengxi.png";
    this.name_cn = "封豨";
  }
}

class MysteryMan extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 20;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 4;
    /* speed定义移动速度 */
    this.speed = 3;
    /* max_health定义最大生命值 */
    this.max_health = 6;
    /* health定义当前生命值 */
    this.health = 6;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    //图片位置
    this.icon = "assets/unit/mystery_man.png";
    this.name_cn = "神秘蒙面战士";
  }
}

class MysteryWitcher extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 14;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 2;
    /* speed定义移动速度 */
    this.speed = 2;
    /* max_health定义最大生命值 */
    this.max_health = 4;
    /* health定义当前生命值 */
    this.health = 4;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 4;
    this.max_range = 9;
    //操作者
    this.commander = new Computer();
    //图片位置
    this.icon = "assets/unit/mystery_witcher.png";
    this.name_cn = "妖道法师"
  }
}

class Zijue extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "zijue";
    this.name_cn = "梓决";
    this.exp = 0;
    //定义阵营,0是队友,1是对手
    this.side = 0;
    this.AI_type = "wait";
    /* attack定义基础攻击力 */
    this.attack = 0;
    /* speed定义移动速度 */
    this.speed = 0;
    /* max_health定义最大生命值 */
    this.max_health = 10;
    /* health定义当前生命值 */
    this.health = 10;
    /* max_armor 定义最大护甲 */
    this.max_armor = 3;
    /* armor 定义护甲 */
    this.armor = 3;
    //图片位置
    this.icon = "assets/unit/zijue.png";
  }
}


class TaiShangLaoJun extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "taishanglaojun";
    this.AI_type = "wait";
    this.name_cn = "太上老君";
    this.exp = 9;
    //定义阵营,0是队友,1是对手
    this.side = 0;
    /* attack定义基础攻击力 */
    this.attack = 0;
    /* speed定义移动速度 */
    this.speed = 0;
    /* max_health定义最大生命值 */
    this.max_health = 16;
    /* health定义当前生命值 */
    this.health = 16;
    /* max_armor 定义最大护甲 */
    this.max_armor = 3;
    /* armor 定义护甲 */
    this.armor = 3;
    //图片位置
    this.icon = "assets/unit/taishang_old_jun.png";
  }
}

class PanguSpirit extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "spirit";
    this.name_cn = "盘古元神";
    this.exp = 10;
    //定义阵营,0是队友,1是对手
    this.side = 1;
    /* attack定义基础攻击力 */
    this.attack = 0;
    /* speed定义移动速度 */
    this.speed = 0;
    /* max_health定义最大生命值 */
    this.max_health = 10;
    /* health定义当前生命值 */
    this.health = 10;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    //图片位置
    this.icon = "assets/unit/pangu_spirit.png";
  }
}

class Desperate extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.name = "desperate";
    this.name_cn = "死士";
    this.exp = 0;
    //定义阵营,0是队友,1是对手
    this.side = 0;
    this.commander_type = "wait";
    /* attack定义基础攻击力 */
    this.attack = 0;
    /* speed定义移动速度 */
    this.speed = 0;
    /* max_health定义最大生命值 */
    this.max_health = 20;
    /* health定义当前生命值 */
    this.health = 20;
    /* max_armor 定义最大护甲 */
    this.max_armor = 2;
    /* armor 定义护甲 */
    this.armor = 2;
    //图片位置
    this.icon = "assets/unit/desperate.png";
  }
}

class FayWarrior extends ComputerUnit
{
  constructor(uuid)
  {
    super(uuid);
    this.exp = 0;
    //定义阵营,0是队友,1是对手
    this.side = 0;
    /* attack定义基础攻击力 */
    this.attack = 3;
    /* speed定义移动速度 */
    this.speed = 5;
    /* max_health定义最大生命值 */
    this.max_health = 5;
    /* health定义当前生命值 */
    this.health = 5;
    /* max_armor 定义最大护甲 */
    this.max_armor = 1;
    /* armor 定义护甲 */
    this.armor = 1;
    /* min/max_range分别定义最小和最大的攻击距离(曼哈顿距离) */
    this.min_range = 1;
    this.max_range = 3;
    //操作者
    this.commander = new Computer();
    //图片位置
    this.icon = "assets/unit/fay_warrior.png";
    this.name_cn = "妖族精锐";
  }
}