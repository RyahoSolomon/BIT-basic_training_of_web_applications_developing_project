function id_img_mapping(block_id)
{
  switch(block_id)
  {
    case 0:
      {
        return "assets/blocks/bamboo_log.png";
      }
    case 1:
      {
        return "assets/blocks/bamboo_mosaic.png";
      }
    case 2:
      {
        return "assets/blocks/bedrock.png";
      }
    case 3:
      {
        return "assets/blocks/cobblestone.png";
      }
    case 4:
      {
        return "assets/blocks/cracked_stone_bricks.png";
      }
    case 5:
      {
        return "assets/blocks/crying_obsidian.png";
      }
    case 6:
      {
        return "assets/blocks/dirt.png";
      }
    case 7:
      {
        return "assets/blocks/grass.png";
      }
    case 8:
      {
        return "assets/blocks/grass_dark.png";
      }
    case 9:
      {
        return "assets/blocks/grasspath.png";
      }
    case 10:
      {
        return "assets/blocks/gravel.png";
      }
    case 11:
      {
        return "assets/blocks/lake_water.png";
      }
    case 12:
      {
        return "assets/blocks/magma.png";
      }
    case 13:
      {
        return "assets/blocks/netherrack.png";
      }
    case 14:
      {
        return "assets/blocks/planks.png";
      }
    case 15:
      {
        return "assets/blocks/sand.png";
      }
    case 16:
      {
        return "assets/blocks/sea_water.png";
      }
    case 17:
      {
        return "assets/blocks/stonebricks.png";
      }
    case 18:
      {
        return "assets/blocks/stonebricks_mossy.png";
      }
    case 20:
      {
        return "assets/blocks/level_0_target_block.png";
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
      hover_initial_html+= '<img id = "hover_initial_mask_' + i + '_' + j +'" src = "assets/mask/transparent_block_mask.png"  onmouseenter = "load_hover_mask(' + i + ',' + j + ')" onmouseleave = "delete_hover_mask(' + i + ',' + j + ')">';
    }
  }
  //console.log(board_html_value);
  document.getElementById("board").innerHTML = board_html_value;
  document.getElementById("hover_initial_mask").innerHTML = hover_initial_html;
}
