import { MouseEvent } from "react";
interface DateRangeButtonProps {
  activeMonth?: number;
  className?: string;
  months?: number;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}
const DateRangeButton = ({
  activeMonth,
  className = "",
  months,
  onClick
}: DateRangeButtonProps) => {
  const displayMonth = months === 12 ? "YTD" : `${months}M`;
  const selectedMonthFilter: string =
    "text-green underline underline-offset-6 cursor-default";
  const isSelected = activeMonth === months;

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
