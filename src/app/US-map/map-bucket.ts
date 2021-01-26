export class MapBucket {
  public minValue: number;
  public maxValue: number;
  public regionCount: number; // count of regions with an item count in [minValue, maxValue] range
  public colorID: number; // assigned last, the color ID to use for this region based on other computations
}
