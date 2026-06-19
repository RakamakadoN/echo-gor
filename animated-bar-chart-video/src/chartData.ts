export type BarDatum = {
  label: string;
  value: number;
  color: string;
};

export const chartData: BarDatum[] = [
  { label: "Alpha", value: 46, color: "#2f80ed" },
  { label: "Beta", value: 72, color: "#27ae60" },
  { label: "Gamma", value: 58, color: "#f2994a" },
  { label: "Delta", value: 88, color: "#eb5757" },
  { label: "Echo", value: 100, color: "#7b61ff" },
];

export const maxChartValue = Math.max(...chartData.map((item) => item.value));

export const getBarHeightRatio = (value: number) => value / maxChartValue;
