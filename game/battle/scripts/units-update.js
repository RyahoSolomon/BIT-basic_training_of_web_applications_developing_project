// 以 Unit 对象关联显示节点，后续召唤单位没有 uuid 也能稳定刷新。
const unit_display_views = new Map();
const unit_display_parts = [
  { name: 'unit', tag: 'img', x: 0, y: 0, className: 'unit' },
  { name: 'health', tag: 'img', x: 4, y: 4, source: 'assets/images/unit/heart.png' },
  { name: 'health_text', tag: 'a', x: 13, y: 4, smallText: true },
  { name: 'armor', tag: 'img', x: 32, y: 4, source: 'assets/images/unit/armor.png' },
  { name: 'armor_text', tag: 'a', x: 41, y: 4, smallText: true },
  { name: 'defending', tag: 'img', x: 0, y: 16, source: 'assets/images/state/defending.png' },
  { name: 'blooding', tag: 'img', x: 0, y: 32, source: 'assets/images/state/blooding.png' },
  { name: 'poison', tag: 'img', x: 48, y: 16, source: 'assets/images/state/poison.png' },
  { name: 'poison_info', tag: 'a', x: 54, y: 18, className: 'poison_info' },
  { name: 'reinforce', tag: 'img', x: 48, y: 32, source: 'assets/images/state/reinforce.png' },
  { name: 'reinforce_info', tag: 'a', x: 54, y: 34, className: 'reinforce_info' },
  { name: 'exp_icon', tag: 'img', x: 0, y: 48, source: 'assets/images/unit/exp.png' },
  { name: 'level_info', tag: 'a', x: 16, y: 48, className: 'level_info' },
  { name: 'exp_info', tag: 'a', x: 16, y: 56, className: 'level_info' },
];

function create_unit_display_view(container)
{
  const nodes = {};
  const fragment = document.createDocumentFragment();
  for(const part of unit_display_parts)
  {
    const node = document.createElement(part.tag);
    node.style.position = 'absolute';
    if(part.source) node.src = part.source;
    if(part.className) node.className = part.className;
    if(part.smallText)
    {
      node.style.fontSize = '8px';
      node.style.color = 'white';
    }
    nodes[part.name] = node;
    fragment.appendChild(node);
  }
  container.appendChild(fragment);
  return { nodes };
}

function set_unit_display_text(node, text)
{
  // 数值未变时也保留原有文字节点，不反复清空并创建它的子节点。
  if(node.textContent !== text) node.textContent = text;
}

function update_unit_display_view(view, unit, id)
{
  if(view.id !== id)
  {
    for(const part of unit_display_parts) view.nodes[part.name].id = part.name + '_' + id;
    view.id = id;
  }
  if(view.x !== unit.x || view.y !== unit.y)
  {
    for(const part of unit_display_parts)
    {
      const node = view.nodes[part.name];
      node.style.left = unit.y * 64 + part.x + 'px';
      node.style.top = unit.x * 64 - 720 + part.y + 'px';
    }
    view.x = unit.x;
    view.y = unit.y;
  }

  const nodes = view.nodes;
  if(nodes.unit.getAttribute('src') !== unit.icon) nodes.unit.src = unit.icon;
  set_unit_display_text(nodes.health_text, unit.health + '/' + unit.max_health);
  set_unit_display_text(nodes.armor_text, unit.armor + '/' + unit.max_armor);
  nodes.defending.hidden = !unit.defending;
  nodes.blooding.hidden = !unit.blooding;
  nodes.poison.hidden = nodes.poison_info.hidden = !(unit.poison > 0);
  nodes.reinforce.hidden = nodes.reinforce_info.hidden = !(unit.reinforce > 0);
  set_unit_display_text(nodes.poison_info, String(unit.poison));
  set_unit_display_text(nodes.reinforce_info, String(unit.reinforce));

  const player = unit.commander_type === 'player';
  nodes.exp_icon.hidden = nodes.level_info.hidden = nodes.exp_info.hidden = !player;
  if(player)
  {
    set_unit_display_text(nodes.level_info, 'level:' + unit.level);
    const experience = unit.level === 6 ? '已满级' : unit.exp + '/' + exp_threshold[unit.level - 1];
    set_unit_display_text(nodes.exp_info, 'exp:' + experience);
  }
}

function get_unit_hover_info(unit)
{
  return '\n\n' + unit.name_cn + '\n阵营:' + (unit.side === 1 ? '敌方' : '友方') +
    '\n攻击力:' + unit.attack + ' 移动速度:' + unit.speed +
    '\n最大攻击距离:' + unit.max_range + ' 最小攻击距离:' + unit.min_range +
    '\n生命值' + unit.health + '/' + unit.max_health + ' 护甲值:' + unit.armor + '/' + unit.max_armor +
    '\n举盾:' + (unit.defending ? '是' : '否') + ' 流血:' + (unit.blooding ? '是' : '否') +
    '\n中毒层数:' + unit.poison + ' 昆仑护体仙术层数:' + unit.reinforce;
}

function units_display_update()
{
  const container = document.getElementById('units');
  const living = new Set(units.slice(0, units_count).filter(unit => unit.is_alive));
  // 先移除死者或已被替换的对象，避免新单位复用数组位置时留下相同 id。
  for(const [unit, view] of unit_display_views)
  {
    if(!living.has(unit))
    {
      for(const node of Object.values(view.nodes)) node.remove();
      unit_display_views.delete(unit);
    }
  }

  const hoverText = map.map(row => row.map(get_block_info));
  for(let id = 0; id < units_count; id++)
  {
    const unit = units[id];
    if(!unit.is_alive) continue;
    let view = unit_display_views.get(unit);
    if(!view)
    {
      view = create_unit_display_view(container);
      unit_display_views.set(unit, view);
    }
    update_unit_display_view(view, unit, id);
    hoverText[unit.x][unit.y] += get_unit_hover_info(unit);
  }
  for(let x = 0; x < height; x++)
  {
    for(let y = 0; y < width; y++)
    {
      const mask = document.getElementById('hover_initial_mask_' + x + '_' + y);
      if(mask.title !== hoverText[x][y]) mask.title = hoverText[x][y];
    }
  }
}

function initial_units(level)
{
  switch(level)
  {
    case 0:
      {
        units[0]=new Protagonist(0);
        units[0].x = 4;
        units[0].y = 1;
        units[0].uuid = units_count;
        units_count++;
        units[1]=new YuanLan(1);
        units[1].x = 3;
        units[1].y = 0;
        units[1].uuid = units_count;
        units_count++;
        units[2]=new YeDai(2);
        units[2].x = 5;
        units[2].y = 0;
        units[2].uuid = units_count;
        units_count++;
        units[3]=new Goblin(3);
        units[3].x = 4;
        units[3].y = 16;
        units[3].uuid = units_count;
        units_count++;
        units[4]=new Ghoul(4);
        units[4].x = 4;
        units[4].y = 14;
        units[4].uuid = units_count;
        units_count++;
        units[5]=new Ghoul(5);
        units[5].x = 3;
        units[5].y = 15;
        units[5].uuid = units_count;
        units_count++;
        units[6]=new Ghoul(6);
        units[6].x = 7;
        units[6].y = 14;
        units[6].uuid = units_count;
        units_count++;
        units[7]=new Goblin(7);
        units[7].x = 8;
        units[7].y = 16;
        units[7].uuid = units_count;
        units_count++;
        units[8]=new Ghoul(8);
        units[8].x = 8;
        units[8].y = 13;
        units[8].uuid = units_count;
        units_count++;
        units[9]=new Goblin(9);
        units[9].x = 1;
        units[9].y = 16;
        units[9].uuid = units_count;
        units_count++;
        break;
      }
    case 1:
      {
        units[units_count]=new Protagonist(0);
        units[units_count].x = 5;
        units[units_count].y = 16;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YuanLan(1);
        units[units_count].x = 6;
        units[units_count].y = 17;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YeDai(2);
        units[units_count].x = 4;
        units[units_count].y = 18;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new FaySupervision(3);
        units[units_count].x = 3;
        units[units_count].y = 1;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Fay(0);
        units[units_count].x = 4;
        units[units_count].y = 2;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Fay(0);
        units[units_count].x = 1;
        units[units_count].y = 6;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Fay(0);
        units[units_count].x = 4;
        units[units_count].y = 4;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Fay(0);
        units[units_count].x = 6;
        units[units_count].y = 3;
        units[units_count].uuid = units_count;
        units_count++;
        break;
      }
    case 2:
      {
        units[units_count]=new Protagonist(0);
        units[units_count].x = 4;
        units[units_count].y = 1;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YuanLan(1);
        units[units_count].x = 3;
        units[units_count].y = 0;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YeDai(2);
        units[units_count].x = 5;
        units[units_count].y = 0;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Ghoul(3);
        units[units_count].x = 6;
        units[units_count].y = 3;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Alghoul(0);
        units[units_count].x = 4;
        units[units_count].y = 6;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Alghoul(0);
        units[units_count].x = 2;
        units[units_count].y = 15;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Ghoul(0);
        units[units_count].x = 5;
        units[units_count].y = 12;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Ghoul(0);
        units[units_count].x = 1;
        units[units_count].y = 3;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Goblin(0);
        units[units_count].x = 1;
        units[units_count].y = 18;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Alghoul(0);
        units[units_count].x = 7;
        units[units_count].y = 19;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new GiantGoblin(0);
        units[units_count].x = 1;
        units[units_count].y = 10;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Alghoul(0);
        units[units_count].x = 8;
        units[units_count].y = 10;
        units[units_count].uuid = units_count;
        units_count++;
        if(!current_info.hidden_clue_god)
        {
          let temp = new Diary();
          temp.x = 1;
          temp.y = 12;
          items.push(temp);
        }
        break;
      }
    case 3:
      {
        units[units_count]=new Zijue(0);
        units[units_count].x = 8;
        units[units_count].y = 8;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new TaiShangLaoJun(0);
        units[units_count].x = 0;
        units[units_count].y = 14;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Protagonist(0);
        units[units_count].x = 4;
        units[units_count].y = 2;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YuanLan(1);
        units[units_count].x = 3;
        units[units_count].y = 1;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YeDai(2);
        units[units_count].x = 4;
        units[units_count].y = 1;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(3);
        units[units_count].x = 3;
        units[units_count].y = 8;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(3);
        units[units_count].x = 5;
        units[units_count].y = 4;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(0);
        units[units_count].x = 7;
        units[units_count].y = 16;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(0);
        units[units_count].x = 8;
        units[units_count].y = 12;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(0);
        units[units_count].x = 6;
        units[units_count].y = 19;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryWitcher(0);
        units[units_count].x = 8;
        units[units_count].y = 14;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryWitcher(0);
        units[units_count].x = 8;
        units[units_count].y = 19;
        units[units_count].uuid = units_count;
        units_count++;
        let temp = new Trigger();
        temp.x = 1;
        temp.y = 14;
        items.push(temp);
        break;
      }
    case 4:
      {
        load_fake_pangu_skill_pos();
        units[units_count]=new Protagonist(0);
        units[units_count].x = 4;
        units[units_count].y = 2;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YuanLan(1);
        units[units_count].x = 3;
        units[units_count].y = 1;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YeDai(2);
        units[units_count].x = 4;
        units[units_count].y = 1;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Alghoul(2);
        units[units_count].x = 4;
        units[units_count].y = 19;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Alghoul(2);
        units[units_count].x = 3;
        units[units_count].y = 16;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new GiantGoblin(2);
        units[units_count].x = 7;
        units[units_count].y = 17;
        units[units_count].uuid = units_count;
        units_count++;
        break;
      }  
    case 5:
      {
        units[units_count]=new Protagonist(0);
        units[units_count].x = 3;
        units[units_count].y = 9;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YuanLan(1);
        units[units_count].x = 3;
        units[units_count].y = 10;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new YeDai(2);
        units[units_count].x = 4;
        units[units_count].y = 9;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new Desperate(units_count);
        units[units_count].x = 4;
        units[units_count].y = 10;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(0);
        units[units_count].x = 3;
        units[units_count].y = 4;
        units[units_count].uuid = units_count;
        units_count++;
        units[units_count]=new MysteryMan(0);
        units[units_count].x = 4;
        units[units_count].y = 15;
        units[units_count].uuid = units_count;
        units_count++;
        break;
      }
  }
  units_display_update();
  //console.log(units_count);
}

function load_fake_pangu_skill_pos()
{
  spirit_pos.push(new Pos(2, 7));
  spirit_pos.push(new Pos(6, 10));
  spirit_pos.push(new Pos(1, 16));
  spirit_pos.push(new Pos(6, 18));
  fire_pos.push(new Pos(1, 6));
  fire_pos.push(new Pos(2, 5));
  fire_pos.push(new Pos(3, 7));
  fire_pos.push(new Pos(5, 6));
  fire_pos.push(new Pos(6, 4));
  fire_pos.push(new Pos(7, 6));
  fire_pos.push(new Pos(4, 9));
  fire_pos.push(new Pos(0, 10));
  fire_pos.push(new Pos(8, 9));
  fire_pos.push(new Pos(4, 11));
  fire_pos.push(new Pos(1, 12));
  fire_pos.push(new Pos(0, 13));
  fire_pos.push(new Pos(3, 13));
  fire_pos.push(new Pos(2, 15));
  fire_pos.push(new Pos(4, 15));
  fire_pos.push(new Pos(6, 16));
  fire_pos.push(new Pos(8, 16));
  fire_pos.push(new Pos(2, 17));
  fire_pos.push(new Pos(5, 17));
  fire_pos.push(new Pos(0, 19));
  fire_pos.push(new Pos(3, 19));
  fire_pos.push(new Pos(7, 19));
  fire_pos.push(new Pos(0, 4));
  fire_pos.push(new Pos(7, 5));
  fire_pos.push(new Pos(5, 8));
  fire_pos.push(new Pos(8, 8));
  fire_pos.push(new Pos(0, 12));
  fire_pos.push(new Pos(2, 11));
  fire_pos.push(new Pos(2, 14));
  fire_pos.push(new Pos(5, 14));
  fire_pos.push(new Pos(8, 14));
  fire_pos.push(new Pos(4, 19));
  fire_pos.push(new Pos(1, 18));
  fire_pos.push(new Pos(2, 19));
  earthquake_pos.push(new Pos(2, 6));
  earthquake_pos.push(new Pos(4, 6));
  earthquake_pos.push(new Pos(2, 8));
  earthquake_pos.push(new Pos(7, 8));
  earthquake_pos.push(new Pos(3, 10));
  earthquake_pos.push(new Pos(5, 10));
  earthquake_pos.push(new Pos(7, 10));
  earthquake_pos.push(new Pos(6, 11));
  earthquake_pos.push(new Pos(2, 12));
  earthquake_pos.push(new Pos(1, 15));
  earthquake_pos.push(new Pos(2, 16));
  earthquake_pos.push(new Pos(1, 17));
  earthquake_pos.push(new Pos(6, 17));
  earthquake_pos.push(new Pos(0, 18));
  earthquake_pos.push(new Pos(4, 18));
  earthquake_pos.push(new Pos(7, 18));
  earthquake_pos.push(new Pos(6, 19));
  earthquake_pos.push(new Pos(0, 5));
  earthquake_pos.push(new Pos(4, 5));
  earthquake_pos.push(new Pos(6, 5));
  earthquake_pos.push(new Pos(8, 5));
  earthquake_pos.push(new Pos(0, 6));
  earthquake_pos.push(new Pos(3, 6));
  earthquake_pos.push(new Pos(6, 6));
  earthquake_pos.push(new Pos(4, 7));
  earthquake_pos.push(new Pos(6, 7));
  earthquake_pos.push(new Pos(3, 8));
  earthquake_pos.push(new Pos(4, 8));
  earthquake_pos.push(new Pos(5, 9));
  earthquake_pos.push(new Pos(7, 9));
  earthquake_pos.push(new Pos(4, 10));
  earthquake_pos.push(new Pos(3, 11));
  earthquake_pos.push(new Pos(5, 12));
  earthquake_pos.push(new Pos(2, 13));
  earthquake_pos.push(new Pos(4, 13));
  earthquake_pos.push(new Pos(0, 14));
  earthquake_pos.push(new Pos(3, 14));
  earthquake_pos.push(new Pos(3, 15));
  earthquake_pos.push(new Pos(8, 15));
  earthquake_pos.push(new Pos(3, 16));
  earthquake_pos.push(new Pos(5, 16));
  earthquake_pos.push(new Pos(3, 17));
  earthquake_pos.push(new Pos(8, 17));
  earthquake_pos.push(new Pos(2, 18));
  earthquake_pos.push(new Pos(8, 18));
  earthquake_pos.push(new Pos(4, 19));
  earthquake_pos.push(new Pos(5, 19));
  swamp_pos.push(new Pos(0, 7));
  swamp_pos.push(new Pos(1, 11));
  swamp_pos.push(new Pos(0, 17));
  swamp_pos.push(new Pos(8, 19));
  swamp_pos.push(new Pos(8, 6));
  thunder_pos.push(new Pos(1, 5));
  thunder_pos.push(new Pos(7, 7));
  thunder_pos.push(new Pos(3, 12));
  thunder_pos.push(new Pos(1, 19));
  thunder_pos.push(new Pos(7, 16));
}