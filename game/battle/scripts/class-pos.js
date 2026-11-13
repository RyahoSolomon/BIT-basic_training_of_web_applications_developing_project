class Pos
{
  constructor(x, y)
  {
    this.x = 0;
    if(x != null)
    {
      this.x = x;
    }
    this.y = 0;
    if(y != null)
    {
      this.y = y;
    }
  }
}

class PointWithDistance
{
  constructor(x, y, distance)
  {
    if(x != null)
    {
      this.x = x;
    }
    else
    {
      this.x = 0;
    }
    if(y != null)
    {
      this.y = y;
    }
    else
    {
      this.y = 0;
    }
    if(distance != null)
    {
      this.distance = distance;
    }
    else
    {
      this.distance = 0;
    }
  }
}

class PointWithDistanceAndTarget
{
  constructor(x, y, distance, target, target_distance)
  {
    if(x != null)
    {
      this.x = x;
    }
    else
    {
      this.x = 0;
    }
    if(y != null)
    {
      this.y = y;
    }
    else
    {
      this.y = 0;
    }
    if(distance != null)
    {
      this.distance = distance;
    }
    else
    {
      this.distance = 0;
    }
    if(target != null)
    {
      this.target = target;
    }
    else
    {
      this.target = -1;
    }
    if(target_distance != null)
    {
      this.target_distance = target_distance;
    }
    else
    {
      this.target_distance = 0;
    }
  }
}