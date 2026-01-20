"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell } from "recharts";

const cy = 102;
const iR = 75;
const oR = 105;

interface SemiPieChartCustomProps {
  percentage: number;
  pieColor?: string;
  title: string;
  desc: string;
  width?: number;
  height?: number;
  textX?: number;
  cx?: number;
}

const SemiPieChartCustom = ({
  percentage,
  pieColor,
  title = "",
  desc = "",
  width = 300,
  height = 95,
  textX = 150,
  cx = 150
}: SemiPieChartCustomProps) => {
  const [isMouned, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMouned) {
    return null;
  }

  const remainingValue = 100 - percentage;

  const data = [
    { name: "A", value: percentage, color: pieColor },
    { name: "B", value: remainingValue, color: "#F5F5F6" }
  ];

  return (
    <PieChart
      style={{ width: "auto", cursor: "inherit" }}
      width={width}
      height={height}
    >
      <Pie
        dataKey="value"
        startAngle={180}
        endAngle={0}
        data={data}
        cx={cx}
        cy={cy}
        innerRadius={iR}
        outerRadius={oR}
        fill="#8884d8"
        stroke="none"
        className="outline-none"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <text
        x={textX}
        y={65}
        textAnchor="middle"
        fill="#000"
        fontSize={16}
        fontWeight="700"
        dominantBaseline="middle"
      >
        {title}
      </text>
      <text
        className="text-xs text-filter-light"
        x={textX}
        y={85}
        textAnchor="middle"
        fill="#000"
        fontSize={16}
        fontWeight="400"
        dominantBaseline="middle"
      >
        {desc}
      </text>
    </PieChart>
  );
};

export default SemiPieChartCustom;
