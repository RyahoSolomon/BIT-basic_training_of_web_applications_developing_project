//https://blog.csdn.net/wulove52/article/details/85804728
//Fisher Yates随机洗牌
function shuffleSelf(array, size) {
  var index = -1,
      length = array.length,
      lastIndex = length - 1;

  size = size === undefined ? length : size;
  while (++index < size) {
      // var rand = baseRandom(index, lastIndex),
      var rand = index + Math.floor( Math.random() * (lastIndex - index + 1))
          value = array[rand];

      array[rand] = array[index];

      array[index] = value;
  }
  array.length = size;
  return array;
}