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
    window.open("../../docs/game-guide.pdf");
    localStorage.setItem("IsFirstPlay", "false");
    alert("首次游玩会弹出教程页面,请务必仔细阅读.部分浏览器会阻止页面弹出,右下角有按钮可随时打开教程.");
  }
  if(current_info.is_inwar_music_on == false)
  {
    document.getElementById("switch_music_state").src = "assets/images/ui/music-off.png";
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
    current_info = GameProgress.createNewProgress().current;
  }
  else
  {
    current_info = JSON.parse(current_info);
  }
}

function initial_game_info()
{
  const defaults = GameProgress.createNewProgress().current;
  if(user_level == null)
  {
    console.log("user等级读取失败");
    user_level = defaults.user_level;
  }
  if(yuanlan_level == null)
  {
    console.log("鸟等级读取失败");
    yuanlan_level = defaults.yuanlan_level;
  }
  if(yedai_level == null)
  {
    console.log("山等级读取失败");
    yedai_level = defaults.yedai_level;
  }
  if(level == null)
  {
    level = 0;
  }
}