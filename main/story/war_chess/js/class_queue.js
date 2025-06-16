class Queue
{
  constructor()
  {
    //初始化,开辟储存空间
    this.value = new Array();
  }
  push(value)
  {
    //入队操作
    this.value.push(value);
  }
  pop()
  {
    //弹出操作
    this.value.splice(0, 1);
  }
  top()
  {
    //返回队首元素
    return this.value[0];
  }
  empty()
  {
    //查看队列是否为空
    return (this.value.length == 0);
  }
}