import React from "react";
import Card from "./Card";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, children }) => {
  return (
    <Card>
      <div className="p-4">
        <h3 className="text-base font-semibold mb-4">{title}</h3>
        {children}
      </div>
    </Card>
  );
};

export default InfoCard;
