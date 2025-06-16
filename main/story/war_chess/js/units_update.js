function units_display_update()
{
  document.getElementById('units').innerHTML = "";
  units_html = '';
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      document.getElementById('hover_initial_mask_' + i + '_' + j).title = get_block_info(map[i][j]);
    }
  }
  for(let i = 0;i < units_count; i++)
  {
    if(units[i].is_alive)
    {
      units_html += '<img src = "' + units[i].icon + '" id = "unit_'+i+'" class = "unit">';
      units_html += '<img src = "assets/unit/heart.png" id = "health_' + i + '">'
      units_html += '<a id = "health_text_' + i + '">' + units[i].health + '/' + units[i].max_health + '</a>';
      units_html += '<img src = "assets/unit/armor.png" id = "armor_' + i + '">'
      units_html += '<a id = "armor_text_' + i + '">' + units[i].armor + '/' + units[i].max_armor + '</a>';
      if(units[i].defending)
      {
        units_html += '<img src = "assets/state/defending.png" id = "defending_' + i + '">';
      }
      if(units[i].blooding)
      {
        units_html += '<img src = "assets/state/blooding.png" id = "blooding_' + i + '">';
      }
      if(units[i].poison > 0)
      {
        units_html += '<img src = "assets/state/poison.png" id = "poison_' + i + '">';
        units_html += '<a id = "poison_info_' + i + '" class = "poison_info">' + units[i].poison + "</a>";
      }
      if(units[i].reinforce > 0)
      {
        units_html += '<img src = "assets/state/reinforce.png" id = "reinforce_' + i + '">';
        units_html += '<a id = "reinforce_info_' + i + '" class = "reinforce_info">' + units[i].reinforce + "</a>";
      }
      if(units[i].commander_type == "player")
      {
        units_html += '<img src = assets/unit/exp.png id = "exp_icon_' + i + '">';
        let level_info = "level:" + units[i].level;
        let exp_info = "exp:";
        if(units[i].level == 6)
        {
          exp_info += "已满级";
        }
        else
        {
          exp_info += units[i].exp + '/';
          exp_info += exp_threshold[units[i].level - 1];
        }
        units_html += '<a id = "level_info_' + i + '" class = "level_info">' +  level_info + '</a>';
        units_html += '<a id = "exp_info_' + i + '" class = "level_info">' +  exp_info + '</a>';
      }
    }
  }
  document.getElementById('units').innerHTML = units_html;
  for(let i  = 0; i < units_count; i++)
  {
    if(units[i].is_alive)
    {
      document.getElementById("unit_" + i).style.position = "absolute";
      document.getElementById("unit_" + i).style.left = units[i].y*64 + "px";
      document.getElementById("unit_" + i).style.top = -720 + units[i].x*64+"px";
      document.getElementById("health_" + i).style.position = "absolute";
      document.getElementById("health_" + i).style.left = units[i].y*64 + 4 + "px";
      document.getElementById("health_" + i).style.top = -716 + units[i].x*64+"px";
      document.getElementById("health_text_" + i).style.position = "absolute";
      document.getElementById("health_text_" + i).style.left = units[i].y*64 + 13 + "px";
      document.getElementById("health_text_" + i).style.top = -716 + units[i].x*64+"px";
      document.getElementById("health_text_" + i).style.fontSize = "8px";
      document.getElementById("health_text_" + i).style.color = "white";
      document.getElementById("armor_" + i).style.position = "absolute";
      document.getElementById("armor_" + i).style.left = units[i].y*64 + 32 + "px";
      document.getElementById("armor_" + i).style.top = -716 + units[i].x*64+"px";
      document.getElementById("armor_text_" + i).style.position = "absolute";
      document.getElementById("armor_text_" + i).style.left = units[i].y*64 + 41 + "px";
      document.getElementById("armor_text_" + i).style.top = -716 + units[i].x*64+"px";
      document.getElementById("armor_text_" + i).style.fontSize = "8px";
      document.getElementById("armor_text_" + i).style.color = "white";
      if(units[i].defending == true)
      {
        //console.log(units[i].name + "is defending:" + units[i].defending)
        document.getElementById("defending_" + i).style.position = "absolute";
        document.getElementById("defending_" + i).style.left = units[i].y * 64 + "px";
        document.getElementById("defending_" + i).style.top = -720 + units[i].x*64 + 16 + "px";
      }
      if(units[i].blooding == true)
      {
        //console.log(units[i].name + "is defending:" + units[i].defending)
        document.getElementById("blooding_" + i).style.position = "absolute";
        document.getElementById("blooding_" + i).style.left = units[i].y * 64 + "px";
        document.getElementById("blooding_" + i).style.top = -720 + units[i].x * 64 + 32 + "px";
      }
      if(units[i].poison > 0)
      {
        //console.log(units[i].name + "is defending:" + units[i].defending)
        document.getElementById("poison_" + i).style.position = "absolute";
        document.getElementById("poison_" + i).style.left = units[i].y * 64 + 48 + "px";
        document.getElementById("poison_" + i).style.top = -720 + units[i].x*64 + 16 + "px";
        document.getElementById("poison_info_" + i).style.position = "absolute";
        document.getElementById("poison_info_" + i).style.left = units[i].y * 64 + 54 + "px";
        document.getElementById("poison_info_" + i).style.top = -720 + units[i].x*64 + 18 + "px";
      }
      if(units[i].reinforce > 0)
      {
        //console.log(units[i].name + "is defending:" + units[i].defending)
        document.getElementById("reinforce_" + i).style.position = "absolute";
        document.getElementById("reinforce_" + i).style.left = units[i].y * 64 + 48 + "px";
        document.getElementById("reinforce_" + i).style.top = -720 + units[i].x*64 + 32 + "px";
        document.getElementById("reinforce_info_" + i).style.position = "absolute";
        document.getElementById("reinforce_info_" + i).style.left = units[i].y * 64 + 54 + "px";
        document.getElementById("reinforce_info_" + i).style.top = -720 + units[i].x*64 + 34 + "px";
      }
      if(units[i].commander_type == "player")
      {
        document.getElementById("exp_icon_" + i).style.position = "absolute";
        document.getElementById("exp_icon_" + i).style.left = units[i].y * 64 + "px";
        document.getElementById("exp_icon_" + i).style.top = -720 + units[i].x * 64 + 48 + "px";
        document.getElementById("level_info_" + i).style.position = "absolute";
        document.getElementById("level_info_" + i).style.left = units[i].y * 64 + 16 + "px";
        document.getElementById("level_info_" + i).style.top = -720 + units[i].x * 64 + 48 + "px";
        document.getElementById("exp_info_" + i).style.position = "absolute";
        document.getElementById("exp_info_" + i).style.left = units[i].y * 64 + 16 + "px";
        document.getElementById("exp_info_" + i).style.top = -720 + units[i].x * 64 + 56+ "px";
      }
      let side_info = "友方";
      if(units[i].side == 1)
      {
        side_info = "敌方";
      }
      document.getElementById('hover_initial_mask_' + units[i].x + '_' + units[i].y).title += "\n\n" + units[i].name_cn + "\n阵营:" + side_info + "\n攻击力:" + units[i].attack + " 移动速度:" + units[i].speed + "\n最大攻击距离:" + units[i].max_range + " 最小攻击距离:" + units[i].min_range + "\n生命值" + units[i].health + "/" + units[i].max_health + " 护甲值:" + units[i].armor + '/' + units[i].max_armor + "\n举盾:" + (units[i].defending ? "是" : "否") + " 流血:" + (units[i].blooding ? "是" : "否") + "\n中毒层数:" + units[i].poison + " 昆仑护体仙术层数:" + units[i].reinforce; 
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