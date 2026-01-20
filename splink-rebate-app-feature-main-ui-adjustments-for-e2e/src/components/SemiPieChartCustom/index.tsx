import { PieChart, Pie, Cell } from "recharts";

const cx = 150;
const cy = 102;
const iR = 75;
const oR = 105;

interface SemiPieChartCustomProps {
  percentage: number;
  pieColor?: string;
}

const SemiPieChartCustom = ({
  percentage,
  pieColor
}: SemiPieChartCustomProps) => {
  const remainingValue = 100 - percentage;

  const data = [
    { name: "A", value: percentage, color: pieColor },
    { name: "B", value: remainingValue, color: "#F5F5F6" }
  ];

  return (
    <PieChart style={{ width: "auto" }} width={300} height={95}>
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
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <text
        x={160}
        y={65}
        textAnchor="middle"
        fill="#000"
        fontSize={20}
        fontWeight="700"
        dominantBaseline="middle"
      >
        {percentage}%
      </text>
      <text
        x={160}
        y={85}
        textAnchor="middle"
        fill="#000"
        fontSize={16}
        fontWeight="400"
        dominantBaseline="middle"
      >
        Compliance
      </text>
    </PieChart>
  );
};

export default SemiPieChartCustom;
