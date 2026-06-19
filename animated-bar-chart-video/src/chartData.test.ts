import { chartData, getBarHeightRatio, maxChartValue } from "./chartData";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

assert(chartData.length === 5, "Animated chart must contain exactly five bars");
assert(maxChartValue === 100, "The chart scale should normalize to a max value of 100");
assert(getBarHeightRatio(50) === 0.5, "A value of 50 should render at half height");
