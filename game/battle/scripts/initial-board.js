function id_img_mapping(block_id)
{
  switch(block_id)
  {
    case 0:
      {
        return "assets/images/blocks/bamboo-log.png";
      }
    case 1:
      {
        return "assets/images/blocks/bamboo-mosaic.png";
      }
    case 2:
      {
        return "assets/images/blocks/bedrock.png";
      }
    case 3:
      {
        return "assets/images/blocks/cobblestone.png";
      }
    case 4:
      {
        return "assets/images/blocks/cracked-stone-bricks.png";
      }
    case 5:
      {
        return "assets/images/blocks/crying-obsidian.png";
      }
    case 6:
      {
        return "assets/images/blocks/dirt.png";
      }
    case 7:
      {
        return "assets/images/blocks/grass.png";
      }
    case 8:
      {
        return "assets/images/blocks/grass-dark.png";
      }
    case 9:
      {
        return "assets/images/blocks/grasspath.png";
      }
    case 10:
      {
        return "assets/images/blocks/gravel.png";
      }
    case 11:
      {
        return "assets/images/blocks/lake-water.png";
      }
    case 12:
      {
        return "assets/images/blocks/magma.png";
      }
    case 13:
      {
        return "assets/images/blocks/netherrack.png";
      }
    case 14:
      {
        return "assets/images/blocks/planks.png";
      }
    case 15:
      {
        return "assets/images/blocks/sand.png";
      }
    case 16:
      {
        return "assets/images/blocks/sea-water.png";
      }
    case 17:
      {
        return "assets/images/blocks/stonebricks.png";
      }
    case 18:
      {
        return "assets/images/blocks/stonebricks-mossy.png";
      }
    case 20:
      {
        return "assets/images/blocks/level-0-target-block.png";
      }
  }
}

function initial_board()
{
  let board_html_value = '';
  let hover_initial_html = '';
  for(let i = 0; i < height; i++)
  {
    for(let j = 0; j < width; j++)
    {
      board_html_value += '<img id = "block_'+i+'_'+j+'" class = "block" src = "' + id_img_mapping(map[i][j]) + '" alt = "block:(' + i + ',' + j + ')">';
      hover_initial_html+= '<img id = "hover_initial_mask_' + i + '_' + j +'" src = "assets/images/mask/transparent-block-mask.png"  onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')">';
    }
  }
  //console.log(board_html_value);
  document.getElementById("board").innerHTML = board_html_value;
  document.getElementById("hover_initial_mask").innerHTML = hover_initial_html;
}
