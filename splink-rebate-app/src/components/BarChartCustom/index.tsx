import { formatNumber } from "@/utils/numberFormatter";
import {
  Bar,
  BarProps,
  CartesianGrid,
  ComposedChart,
  Label,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ActiveShape } from "recharts/types/util/types";
import Loader from "../Loader";

interface DataItem {
  date?: string;
  sales?: number;
  name?: string;
  uv?: number;
  pv?: number;
  amt?: number;
  [key: string]: string | number | undefined; // Allows dynamic keys with numeric values
}

interface BarChartCustomProps {
  data: DataItem[];
  barColor?: string;
  barSize?: number;
  padding?: number;
  xAxisKey: string;
  yAxisKey: string;
  yAxisTickFormatter: (tickItem: number) => string;
  yAxisLabelFormatter?: (label: string | number) => string;
  xAxisLabelFormatter?: (
    label: string | number,
    labelPostfix?: string
  ) => string;
  height?: string;
  maxHeight?: number;
  customBarShape?: ActiveShape<BarProps, SVGPathElement>;
  showAllxAxisTicks?: boolean;
  yAxisWidth?: number;
  fillMissingXValues?: boolean;
  showLegend?: boolean;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  xAxisLabelOffset?: number;
  yAxisLabelOffset?: number;
  loading?: boolean;
  xAxisInterval?: number;
  customTicks?: number[];
  showGrowth?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}

const getPaddedData = (data: DataItem[], xKey: string) => {
  if (data.length >= 4) return data; // Already has 4+ points

  const paddedData = [...data.map((d) => ({ ...d }))]; // Clone original data
  const existingValues = data
    .map((d: any) => Number(d[xKey]))
    .sort((a, b) => a - b); // Extract & sort x-values

  if (existingValues.length === 0) return []; // No data, return empty

  const missingCount = 4 - existingValues.length; // How many more points are needed
  const allValues = new Set(existingValues);
  const minValue = existingValues[0];
  let maxValue = existingValues[existingValues.length - 1];

  if (existingValues.length === 1) {
    // If only 1 value exists, add 7 more points incrementally
    for (let i = 1; i <= missingCount; i++) {
      paddedData.push({ [xKey]: `${minValue + i}`, sales: 0 });
    }
  } else {
    let generatedCount = 0;
    for (let i = 1; i < existingValues.length; i++) {
      const prev = existingValues[i - 1];
      const curr = existingValues[i];
      const innerStep = (curr - prev) / (missingCount + 1 - generatedCount);
      const innerCount = Math.min(
        missingCount - generatedCount,
        Math.floor((curr - prev) / innerStep)
      );

      for (let j = 1; j <= innerCount; j++) {
        const newValue = Math.round(prev + innerStep * j);
        if (!allValues.has(newValue)) {
          allValues.add(newValue);
          paddedData.push({ [xKey]: `${newValue}`, sales: 0 });
          generatedCount++;
          if (generatedCount >= missingCount) break;
        }
      }
      if (generatedCount >= missingCount) break;
    }

    // If still missing points, add incremental values after maxValue
    while (paddedData.length < 4) {
      maxValue += 1;
      paddedData.push({ [xKey]: `${maxValue}`, sales: 0 });
    }
  }

  return paddedData.sort((a: any, b: any) => Number(a[xKey]) - Number(b[xKey])); // Sort for correct order
};

const BarChartCustom = ({
  data,
  barColor = "#FF9900",
  barSize = 7,
  padding = 10,
  xAxisKey,
  yAxisKey,
  yAxisTickFormatter,
  yAxisLabelFormatter,
  xAxisLabelFormatter,
  height = "h-[200px]",
  customBarShape,
  showAllxAxisTicks = false,
  yAxisWidth,
  showLegend,
  top = 0,
  right = 0,
  bottom = -10,
  left = -20,
  xAxisLabelOffset = 0,
  yAxisLabelOffset = 25,
  maxHeight,
  loading,
  xAxisInterval,
  fillMissingXValues = false,
  customTicks,
  showGrowth = false
}: BarChartCustomProps) => {
  const edittedData = fillMissingXValues ? getPaddedData(data, xAxisKey) : data;

  // Custom tick formatter for the X-axis to show fewer values
  const xAxisTickFormatter = (value: string, index: number) => {
    if (xAxisKey == "date" && value && typeof value == "string") {
      const [month, day] = value.split(" ");
      return `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
    }

    if (showAllxAxisTicks || xAxisInterval) return value;

    const numberOfTicks = 8;
    const totalItems = data.length;
    const step = Math.ceil(totalItems / numberOfTicks); // Show a tick every Nth value
    return index % step === 0 ? value : "";
  };

  const CustomTooltip: React.FC<CustomTooltipProps> = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length) {
      const xAxisValue = payload[0].value;
      const xAxisValueLastYear = payload[1] ? payload[1].value : "";

      let yoyLable: string[] = [];

      if (xAxisValueLastYear) {
        yoyLable = [
          new Date().getFullYear().toString(),
          (new Date().getFullYear() - 1).toString()
        ];
      }

      return (
        <div className="custom-tooltip bg-white border rounded shadow-lg p-1.5">
          <p className="label font-medium">
            {yAxisLabelFormatter ? yAxisLabelFormatter(label ?? "") : label}
          </p>
          {xAxisValueLastYear && (
            <p className="label font-normal">
              {xAxisLabelFormatter
                ? xAxisLabelFormatter(
                    xAxisValueLastYear,
                    yoyLable[yoyLable.length - 1]
                  )
                : `$${formatNumber(xAxisValueLastYear)}`}
            </p>
          )}
          <p className="label font-normal">
            {xAxisLabelFormatter
              ? xAxisLabelFormatter(xAxisValue, yoyLable[0])
              : `$${formatNumber(xAxisValue)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`w-full ${height} relative`}
      style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}
    >
      {loading ? (
        <Loader
          show={loading}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-transparent"
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%" className={`relative`}>
          <ComposedChart
            width={500}
            height={300}
            data={edittedData}
            margin={{
              top,
              right,
              left,
              bottom
            }}
            barSize={barSize}
          >
            <XAxis
              dataKey={xAxisKey}
              scale="point"
              padding={{ left: padding, right: padding }}
              tickFormatter={xAxisTickFormatter}
              tick={{ fontSize: 12, fontWeight: 400 }}
              interval={xAxisInterval}
              axisLine={false}
            >
              {showLegend && (
                <Label
                  value="Sku Count" // Label text
                  position="insideBottom" // Positioned at the bottom of the axis
                  offset={xAxisLabelOffset} // Adjusts distance from the axis line
                  fontSize={14}
                  fontWeight={600}
                  fill="#000"
                />
              )}
            </XAxis>

            <YAxis
              tickFormatter={yAxisTickFormatter}
              tick={{ fontSize: 12, fontWeight: 400 }}
              width={yAxisWidth}
              // ticks={customTicks}
              axisLine={false}
            >
              {showLegend && (
                <Label
                  value="Store Count" // Description of Y-axis data
                  position={{
                    x: 25,
                    y: 60
                  }} // Positioned to the left of the axis
                  angle={-90} // Rotated to be vertically upwards
                  offset={yAxisLabelOffset} // Adjusts distance from the axis line
                  fontSize={14}
                  fontWeight={600}
                  fill="#000"
                />
              )}
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            <Bar dataKey={yAxisKey} fill={barColor} shape={customBarShape} />

            {
              <Legend
                verticalAlign="top"
                align="right"
                payload={[
                  {
                    value: "storeCountLastYear",
                    type: "line",
                    color: "#dc2626"
                  },
                  {
                    value: "storeCount",
                    type: "rect",
                    color: "#0071B3"
                  }
                ]}
                wrapperStyle={{
                  fontSize: "14px",
                  position: "absolute",
                  opacity: showLegend && showGrowth ? 1 : 0,
                  width: "max-content",
                  top: -46,
                  right: -10
                }}
                formatter={(value) => {
                  const legendMap: Record<string, string> = {
                    storeCount: new Date().getFullYear().toString(),
                    storeCountLastYear: new Date().getFullYear() - 1 + ""
                  };
                  return legendMap[value] || value;
                }}
              />
            }

            {/* Line for storeCountLastYear */}
            {showGrowth && (
              <Line
                strokeDasharray="3 4"
                dataKey="storeCountLastYear"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{
                  fill: "#dc2626",
                  r: 4,
                  strokeWidth: 2,
                  stroke: "#FF9900",
                  strokeDasharray: "0"
                }}
                activeDot={{
                  fill: "#dc2626",
                  r: 4,
                  strokeWidth: 2,
                  stroke: "#FF9900",
                  strokeDasharray: "0"
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default BarChartCustom;
