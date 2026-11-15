function load_annoucement()
{
  announcement_list = Array.prototype.slice.call(announcement_list,0);
  while(announcement_list.length > 5)
  {
    announcement_list.shift();
  }
  announcement_innerhtml = '';
  for(let i = 0; i < announcement_list.length; i++)
  {
    announcement_innerhtml += '<p id = "announcement_text">' + announcement_list[i] + '\n</p>';
  }
  document.getElementById("announcement").innerHTML = announcement_innerhtml;
}