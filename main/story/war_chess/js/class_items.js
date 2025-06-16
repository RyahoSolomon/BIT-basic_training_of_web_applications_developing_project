class Item
{
  constructor()
  {
    //构造函数,初始化基本属性
    this.name_cn = "";
    this.lore = "";
    this.type = "";
    this.icon = "";
    this.x = 0;
    this.y = 0;
    this.rest_existing_turn = -1;
    this.visible = true;
  }
  effect()
  {
    //虚函数(模拟出来的)
  }
}

class Trap extends Item
{
  constructor(attack,owner)
  {
    //调用父类构造函数
    super();
    this.owner = 0;
    if(owner != null)
    {
      this.owner = owner;
    }
    //初始化成员变量
    this.type = "trap";
    this.icon = "assets/item/trap.png";
    this.rest_existing_turn = 3;
    this.attack = parseInt(attack * 1.5);
    this.name_cn = "捕兽夹陷阱";
    this.lore = "回合结束时,对踩在此单元格上单位清除护甲并造成" + this.attack + "点伤害后消失";
  }
  effect()
  {
    //搜索并实现伤害单元格上的单位
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].is_alive && units[i].x == this.x && units[i].y == this.y)
      {
        units[i].armor = 0;
        units[i].get_hurt(this.attack, this.owner);
        units[i].blooding = true;
        this.rest_existing_turn = 0;
        break;
      }
    }
  }
}

class Diary extends Item
{
  constructor()
  {
    super();
    this.type = "diary";
    this.icon = "assets/item/xuanyuan_diary.png";
    this.rest_existing_turn = -1;
    this.name_cn = "神秘的古老日记";
    this.lore = "像本日记,看起来似乎已经很古老了,要不要来上面看看呢?";
  }
  effect()
  {
    if(this.visible == false)
    {
      return;
    }
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].x == this.x && units[i].y == this.y && units[i].commander_type == "player" && units[i].is_alive)
      {
        current_info.hidden_clue_god = true;
        loadPlots();
        this.rest_existing_turn = 0;
        this.visible = false;
        localStorage.setItem("current",JSON.stringify(current_info));
      }
    }
  }
}

class Trigger extends Item
{
  constructor()
  {
    super();
    this.type = "trigger";
    this.icon = "assets/item/trigger.png";
    this.rest_existing_turn = -1;
    this.name_cn = "对话处";
    this.lore = "来此处与附近的NPC对话";
  }
  effect()
  {
    if(current_info.hidden_clue_poison == true || is_designated_unit_dead("taishanglaojun"))
    {
      return;
    }
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].x == this.x && units[i].y == this.y && units[i].commander_type == "player" && units[i].is_alive)
      {
        loadPlots();
      }
    }
  }
}

class Fire extends Item
{
  constructor(x, y)
  {
    super();
    if(x != null)
    {
      this.x = x;
    }
    if(y != null)
    {
      this.y = y;
    }
    this.rest_existing_turn = 4;
    this.type = "fire";
    this.icon = "assets/item/fire.png";
    this.name_cn = "火焰";
    this.lore = "回合结束时对此单元格上友方单位造成2点伤害";
  }
  effect()
  {
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].x == this.x && units[i].y == this.y)
      {
        if(units[i].side == 0 && units[i].is_alive)
        {
          units[i].get_hurt(2);
        }
        break;
      }
    }
  }
}

class Earthquake extends Item
{
  constructor(x, y)
  {
    super();
    if(x != null)
    {
      this.x = x;
    }
    if(y != null)
    {
      this.y = y;
    }
    this.rest_existing_turn = 0;
    this.type = "earthquake";
    this.icon = "assets/item/earthquake.png";
    this.name_cn = "地裂";
    this.lore = "回合结束时,杀死此单元格上的友方单位";
  }
  effect()
  {
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].x == this.x && units[i].y == this.y)
      {
        if(units[i].side == 0 && units[i].is_alive)
        {
          units[i].get_hurt(units[i].armor + units[i].health + 1);
        }
        break;
      }
    }
  }
}

class Thunder extends Item
{
  constructor(x, y)
  {
    super();
    if(x != null)
    {
      this.x = x;
    }
    if(y != null)
    {
      this.y = y;
    }
    this.rest_existing_turn = 2;
    this.type = "thunder";
    this.icon = "assets/item/thunder.png";
    this.triggered = false;
    this.name_cn = "震雷阵眼";
    this.lore = "如果此阵眼消失前还未有友方单位来过此单元格,则会对场上一名友军造成高额伤害.";
  }
  effect()
  {
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].x == this.x && units[i].y == this.y)
      {
        if(units[i].side == 0 && units[i].is_alive)
        {
          this.triggered = true;
          this.rest_existing_turn = 0;
        }
        break;
      }
    }
  }
}

class Swamp extends Item
{
  constructor(x, y)
  {
    super();
    if(x != null)
    {
      this.x = x;
    }
    if(y != null)
    {
      this.y = y;
    }
    this.rest_existing_turn = 2;
    this.type = "swamp";
    this.icon = "assets/item/swamp.png";
    this.triggered = false;
    this.name_cn = "兑泽阵眼";
    this.lore = "如果此阵眼消失前还未有友方单位来过此单元格,则会对场上友军叠加中毒层数.";
  }
  effect()
  {
    for(let i = 0; i < units_count; i++)
    {
      if(units[i].x == this.x && units[i].y == this.y)
      {
        if(units[i].side == 0 && units[i].is_alive)
        {
          this.triggered = true;
          this.rest_existing_turn = 0;
        }
        break;
      }
    }
  }
}

function load_items()
{
  let item_count = items.length;
  document.getElementById("items").innerHTML = '';
  let items_innerhtml = '';
  for(let i = 0; i < item_count; i++)
  {
    if(!items[i].visible)
    {
      continue;
    }
    items_innerhtml += '<img src = "' + items[i].icon + '" id = "item_' + i +'">';
    if(items[i].rest_existing_turn >= 0)
    {
      items_innerhtml += '<a id = "item_text_' + i +'" class = "item_info">剩余存在回合:' + items[i].rest_existing_turn + "</a>";
    }
  }
  document.getElementById("items").innerHTML = items_innerhtml;
  for(let i = 0; i < item_count; i++)
  {
    let current_item_element = document.getElementById("item_" + i);
    current_item_element.style.position = "absolute";
    current_item_element.style.left = items[i].y * 64 + "px";
    current_item_element.style.top = items[i].x * 64 - 720 + "px";
    document.getElementById('hover_initial_mask_' + items[i].x + '_' + items[i].y).title += "\n\n" + items[i].name_cn + "\n" + items[i].lore + ((items[i].rest_existing_turn >= 0) ? ("\n剩余回合数:" + items[i].rest_existing_turn) : (""));
    if(items[i].rest_existing_turn >= 0)
    {
      current_item_element = document.getElementById("item_text_" + i)
      current_item_element.style.position = "absolute";
      current_item_element.style.left = items[i].y * 64 + "px";
      current_item_element.style.top = items[i].x * 64 - 720 + 52 + "px";
    }
  }
}
