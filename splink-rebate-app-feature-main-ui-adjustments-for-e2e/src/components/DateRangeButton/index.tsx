import { MouseEvent } from "react";
interface DateRangeButtonProps {
  activeMonth?: number;
  className?: string;
  months?: number;
  year?: number;
  selectedYear?: number | null;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}
const DateRangeButton = ({
  activeMonth,
  className = "",
  months,
  year,
  selectedYear,
  onClick
}: DateRangeButtonProps) => {
  const displayMonth = year ? `${year}` : months === 12 ? "YTD" : `${months}M`;
  const selectedMonthFilter: string =
    "text-green underline underline-offset-6 cursor-default";
  const isSelected = year
    ? selectedYear === year && activeMonth === 12
    : activeMonth === months && !selectedYear;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!isSelected && onClick) {
      onClick(e);
    }
  };

  return (
    <div
      className={`${
        isSelected ? selectedMonthFilter : "cursor-pointer"
      } ${className}`}
      onClick={handleClick}
    >
      {displayMonth}
    </div>
  );
};

export default DateRangeButton;
