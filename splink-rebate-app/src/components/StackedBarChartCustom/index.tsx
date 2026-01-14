import { formatNumber } from "@/utils/numberFormatter";
import {
  Bar,
  BarProps,
  CartesianGrid,
  ComposedChart,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ActiveShape } from "recharts/types/util/types";
import ColorBox from "../ColorBox";
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

interface StackedBarChartCustomProps {
  data: DataItem[];
  barColor?: string;
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
  yAxisBarKeys?: string[];
  removeAxisCurrencySign?: boolean;
  yAxisKeyPrefix?: string;
  stackedBarKeys?: string[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload?: any }[];
  label?: string;
}

const getPaddedData = (data: DataItem[], xKey: string) => {
  if (data.length >= 8) return data; // Already has 8+ points

  const paddedData = [...data.map((d) => ({ ...d }))]; // Clone original data
  const existingValues = data
    .map((d: any) => Number(d[xKey]))
    .sort((a, b) => a - b); // Extract & sort x-values

  if (existingValues.length === 0) return []; // No data, return empty

  const missingCount = 8 - existingValues.length; // How many more points are needed
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
    while (paddedData.length < 8) {
      maxValue += 1;
      paddedData.push({ [xKey]: `${maxValue}`, sales: 0 });
    }
  }

  return paddedData.sort((a: any, b: any) => Number(a[xKey]) - Number(b[xKey])); // Sort for correct order
};

const StackedBarChartCustom = ({
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
  left = -17,
  xAxisLabelOffset = 0,
  yAxisLabelOffset = 25,
  maxHeight,
  loading,
  xAxisInterval,
  fillMissingXValues = false,
  yAxisBarKeys,
  removeAxisCurrencySign,
  yAxisKeyPrefix,
  stackedBarKeys
}: StackedBarChartCustomProps) => {
  const edittedData = fillMissingXValues ? getPaddedData(data, xAxisKey) : data;

  // Custom tick formatter for the X-axis to show fewer values
  const xAxisTickFormatter = (value: string, index: number) => {
    if (
      xAxisKey == "date" &&
      value &&
      typeof value == "string" &&
      value.toLowerCase().includes("week")
    )
      return value;

    if (xAxisKey == "date" && value && typeof value == "string") {
      if (value.includes(" to ")) {
        return value;
      }
      const [month, day] = value.split(" ");
      if (isNaN(Number(day))) return value;

      if (Number(day) && Number(day) % 2 === 0) {
        return `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
      }
      return "";
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
      const key = stackedBarKeys?.length
        ? stackedBarKeys[stackedBarKeys?.length - 1]
        : undefined;

      const xAxisValue = yAxisBarKeys?.length
        ? yAxisBarKeys
            ?.filter((label: any) => (key ? label.includes(key) : true))
            ?.reduce(
              (sum, label) => sum + (payload?.[0]?.payload[label ?? 0] || 0),
              0
            )
        : payload[0].value;

      const currencySign = removeAxisCurrencySign ? "" : "$";

      return (
        <div className="custom-tooltip bg-white border rounded shadow-lg p-1.5">
          <div className="w-full flex flew-row justify-between gap-3">
            <p className="label font-medium">
              {yAxisLabelFormatter ? yAxisLabelFormatter(label ?? "") : label}
            </p>
            {yAxisKeyPrefix ? (
              <p>{`Total: ${currencySign}${formatNumber(xAxisValue)}`}</p>
            ) : null}
          </div>

          {!yAxisKeyPrefix && !yAxisBarKeys?.length ? (
            <p className="label font-normal">
              {xAxisLabelFormatter
                ? xAxisLabelFormatter(xAxisValue)
                : `${currencySign}${formatNumber(xAxisValue)}`}
            </p>
          ) : null}
          {yAxisBarKeys?.length && yAxisKeyPrefix ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {yAxisBarKeys?.map((key: string, index: number) =>
                stackedBarKeys?.length &&
                stackedBarKeys.find((Linekey: string) =>
                  key.includes(Linekey)
                ) ? (
                  <div
                    className="label font-normal flex-row flex gap-1 items-center text-sm"
                    key={`stacked-bar-${index}`}
                  >
                    {payload?.[0]?.payload[
                      "color_" + key?.replace(yAxisKeyPrefix, "")
                    ] ? (
                      <ColorBox
                        color={
                          payload?.[0]?.payload[
                            "color_" + key?.replace(yAxisKeyPrefix, "")
                          ]
                        }
                      />
                    ) : (
                      ""
                    )}
                    {stackedBarKeys?.length
                      ? stackedBarKeys
                          .find((Linekey: string) => key.includes(Linekey))
                          ?.replaceAll("_", "") + ": "
                      : ""}

                    {`${currencySign}${formatNumber(payload?.[0]?.payload[key ?? 0])}`}
                  </div>
                ) : (
                  <></>
                )
              )}
            </div>
          ) : null}
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
              axisLine={false}
            >
              {showLegend && (
                <Label
                  value="Store Count" // Description of Y-axis data
                  position="insideLeft" // Positioned to the left of the axis
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

            {yAxisBarKeys?.length ? (
              [...(stackedBarKeys?.length ? stackedBarKeys : ["a"])].map(
                (stackId: string) =>
                  yAxisBarKeys
                    .filter((bar: string) =>
                      stackedBarKeys?.length ? bar.includes(stackId) : true
                    )
                    .map((bar: string, index: number) => (
                      <Bar
                        key={`${bar}-${index}`}
                        dataKey={bar}
                        fill={
                          edittedData?.[0]?.[
                            "color_" + bar?.replace(yAxisKeyPrefix ?? "", "")
                          ]?.toString() ?? barColor
                        }
                        shape={customBarShape}
                        stackId={stackId}
                      />
                    ))
              )
            ) : (
              <Bar dataKey={yAxisKey} fill={barColor} shape={customBarShape} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
export default StackedBarChartCustom;
