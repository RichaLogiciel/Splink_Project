"use client";

import React from "react";
import Image from "next/image";

import Card from "@/components/Card";
import PieChartCustom from "@/components/PieChartCustom";
import greenAnnouncementIcon from "@/assets/icons/greenAnnouncement.svg";

export interface TierAchievedCardType {
  label: string;
  percentage: number;
  fullWidth?: boolean;
  isFlexible?: boolean;
  status?: {
    total?: number;
    completed?: number;
  };
}

function TierAchievedCard({
  percentage,
  fullWidth,
  isFlexible = false,
  status
}: TierAchievedCardType) {
  return (
    // <Card
    //   className={`w-full !h-[121px] ${
    //     !fullWidth && "sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
    //   } ${isFlexible ? "flex-1" : "flex-0"}`}
    // >
    <Card
      className={`w-full h-[121px] ${
        !fullWidth && " lg:w-[calc(25%-18px)]"
      } ${isFlexible ? "flex-1" : "flex-0"}`}
    >
      <div className="flex gap-1.5 items-center">
        <Image
          src={greenAnnouncementIcon}
          alt="Total Sales Icon"
          width={21}
          height={21}
        />
        <span className="text-sm font-medium text-heading-light">
          Program Compliance
        </span>
      </div>

      <div className="flex gap-3 p-3  items-center">
        <PieChartCustom percentage={percentage || 0} />
        <div className="text-xs text-heading-very-light ">
          <p className="font-semibold tracking-widest">
            <span className="text-green text-3xl">{status?.completed}</span>
            <span className="text-lg">/{status?.total}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}

export default TierAchievedCard;
