function pre_load()
{
  //level = 0;
  load_map(level);
  initial_board();
  initial_units(level);
  if(level == 4)
  {
    summon_pangu_spirit();
  }
  let is_first_play = localStorage.getItem("IsFirstPlay");
  if(current_info.is_inwar_music_on)
  {
    document.getElementById("switch_music_state_mask").title = "关闭音乐";
  }
  else
  {
    document.getElementById("switch_music_state_mask").title = "开启音乐";
  }
  if(is_first_play == null || is_first_play == "true")
  {
    window.open("guide/game_guide.pdf");
    localStorage.setItem("IsFirstPlay", "false");
    alert("首次游玩会弹出教程页面,请务必仔细阅读.部分浏览器会阻止页面弹出,右下角有按钮可随时打开教程.");
  }
  if(current_info.is_inwar_music_on == false)
  {
    document.getElementById("switch_music_state").src = "assets/UI/music_off.png";
  }
  shuffleSelf(music_library, music_library.length);
  document.getElementById("audioPlayer").src = music_library[0];
}

function start_game()
{
  start_turn();
}

function initial_current_info()
{
  if(current_info == null)
  {
    console.log("current读取失败");
    current_info = 
    {
      level: 0,
      is_inwar_music_on: true,
      hidden_clue_god: false,
      hidden_clue_poison: false,
      yuanlan_level:
      {
        level: 1,
        exp: 0,
      },
      user_level:
      {
        level: 1,
        exp: 0,
      },
      yedai_level:
      {
        level: 1,
        exp: 0,
      },
      perfect_level_complete: [false, false, false, false, false, false],
    }
  }
  else
  {
    current_info = JSON.parse(current_info);
  }
}

function initial_game_info()
{
  if(user_level == null)
  {
    console.log("user等级读取失败");
    user_level = 
    {
      level: 1,
      exp: 0,
    };
  }
  if(yuanlan_level == null)
  {
    console.log("鸟等级读取失败");
    yuanlan_level =
    {
      level: 1,
      exp: 0,
    }
  }
  if(yedai_level == null)
  {
    console.log("山等级读取失败");
    yedai_level =
    {
      level: 1,
      exp: 0,
    }
  }
  if(level == null)
  {
    level = 0;
  }
}