"use client";
import { getProgressBarColor } from "@/utils/helper";
import { CSSProperties, useEffect, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";

const cx = 120;
const cy = 15;
const iR = 75;
const oR = 115;

interface PieChartCustomProps {
  percentage: number;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  useDynamicColor?: boolean;
  backgroundColor?: string;
}

const PieChartCustom = ({
  percentage,
  width,
  height,
  useDynamicColor,
  backgroundColor = "#F5F5F6",
  ...props
}: PieChartCustomProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const remainingValue = 100 - percentage;
  const color = useDynamicColor ? getProgressBarColor(percentage) : "#106210";
  const data = [
    { name: "A", value: percentage, color: color },
    { name: "B", value: remainingValue, color: backgroundColor }
  ];

  return (
    <PieChart {...props} width={width || 250} height={height || 40}>
      <Pie
        dataKey="value"
        startAngle={90}
        endAngle={-270}
        data={data}
        cx={cx}
        cy={cy}
        innerRadius={iR}
        outerRadius={oR}
        fill="#8884d8"
        stroke="none"
        strokeWidth={25}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
    </PieChart>
  );
};

export default PieChartCustom;
