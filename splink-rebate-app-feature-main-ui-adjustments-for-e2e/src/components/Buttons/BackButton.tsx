"use client";

import Image from "next/image";
import Link from "next/link";

import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";

interface BackButtonProps {
  link: string;
  bypassHistory?: boolean;
}

const BackButton: React.FC<BackButtonProps> = ({
  link,
  bypassHistory = false
}) => {
  const handleBackButton = () => {
    if (window.history.length > 1 && !bypassHistory) {
      history.back();
    }

    return;
  };

  return (
    <Link
      className="w-6 items-center p-1.5"
      href={link}
      onClick={handleBackButton}
    >
      <Image
        src={leftArrowIcon.src}
        width={8}
        height={14}
        alt="leftArrowIcon"
      />
    </Link>
  );
};

export default BackButton;
