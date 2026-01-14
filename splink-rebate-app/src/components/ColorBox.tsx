"use client";

interface ColorBoxProps {
  color: string;
}
const ColorBox = ({ color }: ColorBoxProps) => {
  return (
    <div
      style={{
        width: "12px",
        height: "12px",
        borderRadius: "3px",
        backgroundColor: color
      }}
    ></div>
  );
};

export default ColorBox;
