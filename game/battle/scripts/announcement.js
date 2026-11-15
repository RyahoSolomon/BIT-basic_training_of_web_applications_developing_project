function load_annoucement()
{
  announcement_list = Array.prototype.slice.call(announcement_list,0);
  while(announcement_list.length > 5)
  {
    announcement_list.shift();
  }
  const announcements = document.createDocumentFragment();
  for(let i = 0; i < announcement_list.length; i++)
  {
    const paragraph = document.createElement('p');
    paragraph.id = 'announcement_text';
    paragraph.textContent = announcement_list[i] + '\n';
    announcements.append(paragraph);
  }
  document.getElementById("announcement").replaceChildren(announcements);
}
