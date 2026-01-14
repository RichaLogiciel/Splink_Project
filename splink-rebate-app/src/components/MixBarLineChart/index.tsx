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

interface MixBarLineChartProps {
  data: DataItem[];
  barColor?: string;
  pastYearLabel?: string;
  barSize?: number;
  padding?: number;
  xAxisKey: string;
  yAxisKey: string;
  yAxisTickFormatter: (tickItem: number) => string;
  yAxisLabelFormatter?: (label: string | number) => string;
  xAxisLabelFormatter?: (label: string | number) => string;
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
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any;
  label?: string;
}
const MixBarLineChart = ({
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
  customTicks,
  pastYearLabel = ""
}: MixBarLineChartProps) => {
  const edittedData = data;

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
      const lineSkuCount = payload[0]?.payload.lineSkuCount;
      const lineStoreCount = payload[0]?.payload.lineStoreCount;

      return (
        <div className="custom-tooltip bg-white border rounded shadow-lg p-1.5">
          {/* Show Past Year data */}
          {pastYearLabel && (
            <div className="opacity-65">
              {lineSkuCount ? (
                <p className="label font-medium flex gap-1">
                  <span className="text-primary">{pastYearLabel}</span>
                  {yAxisLabelFormatter
                    ? yAxisLabelFormatter(lineSkuCount ?? "")
                    : lineSkuCount}
                </p>
              ) : null}
              {lineStoreCount ? (
                <p className="label font-normal flex gap-1">
                  <span className="text-primary">{pastYearLabel}</span>

                  {xAxisLabelFormatter
                    ? xAxisLabelFormatter(payload[0]?.payload.lineStoreCount)
                    : `$${formatNumber(payload[0]?.payload.lineStoreCount)}`}
                </p>
              ) : null}
            </div>
          )}

          <p className="label font-medium">
            {yAxisLabelFormatter ? yAxisLabelFormatter(label ?? "") : label}
          </p>
          <p className="label font-normal">
            {xAxisLabelFormatter
              ? xAxisLabelFormatter(xAxisValue)
              : `$${formatNumber(xAxisValue)}`}
          </p>
        </div>
      );
    }
    return null;
  };
  console.log("Processed Data for Chart:", yAxisKey, edittedData);

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
        <ResponsiveContainer width="100%" height="100%">
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
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: "14px" }}
              formatter={(value) => {
                const legendMap: Record<string, string> = {
                  storeCount: new Date().getFullYear().toString(),
                  lineStoreCount: pastYearLabel
                };
                return legendMap[value] || value; // Default to dataKey if not mapped
              }}
            />
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
                <>
                  <Label
                    value="Sku Count" // Label text
                    position="insideBottom" // Positioned at the bottom of the axis
                    offset={xAxisLabelOffset} // Adjusts distance from the axis line
                    fontSize={14}
                    fontWeight={600}
                    fill="#000"
                  />
                </>
              )}
            </XAxis>
            <XAxis dataKey={xAxisKey} />

            <YAxis
              tickFormatter={yAxisTickFormatter}
              tick={{ fontSize: 12, fontWeight: 400 }}
              width={yAxisWidth}
              ticks={customTicks}
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
            <Line
              dataKey="lineStoreCount"
              stroke="#d3d3d3"
              strokeWidth={2}
              z={9999999}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default MixBarLineChart;
