"use client";
import { useState, useEffect } from "react";
import { PieChart, Pie, Cell } from "recharts";

const cx = 120;
const cy = 15;
const iR = 90;
const oR = 115;

interface PieChartCustomProps {
  percentage: number;
}

const PieChartCustom = ({ percentage }: PieChartCustomProps) => {
  const [isMouned, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMouned) {
    return null;
  }

  const remainingValue = 100 - percentage;

  const data = [
    { name: "A", value: percentage, color: "#106210" },
    { name: "B", value: remainingValue, color: "#F5F5F6" }
  ];

  return (
    <PieChart style={{ width: "40px" }} width={250} height={40}>
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
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <text
        x={130}
        y={30}
        textAnchor="middle"
        fill="#106210"
        fontSize={70}
        fontWeight="600"
        dominantBaseline="middle"
      >
        {percentage}%
      </text>
    </PieChart>
  );
};

export default PieChartCustom;
