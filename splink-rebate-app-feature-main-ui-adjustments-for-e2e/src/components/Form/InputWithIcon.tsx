import greyCrossIcon from "@/assets/icons/greyCrossIcon.svg";
import CustomInput from "@/core-ui/Input";
import Image from "next/image";
import React from "react";

interface InputWithIconProps {
  icon?: string;
  containerClass?: string;
  iconClass?: string;
  clearIcon?: boolean;
  [props: string]: any;
  onClearBtnClick?: React.MouseEventHandler<HTMLImageElement>;
}
const InputWithIcon: React.FC<InputWithIconProps> = ({
  containerClass,
  icon,
  clearIcon,
  iconClass,
  onClearBtnClick,
  ...props
}) => {
  return (
    <div className={`${containerClass} relative`}>
      {icon && (
        <Image
          height={14}
          width={14}
          className={`absolute top-3 left-3 ${iconClass}`}
          src={icon}
          alt="Search icon"
        />
      )}
      {clearIcon && (
        <Image
          onClick={onClearBtnClick}
          height={10}
          width={10}
          className={`cursor-pointer absolute top-1/2 -translate-y-1/2 right-4 ${iconClass}`}
          src={greyCrossIcon.src}
          alt="Search icon"
        />
      )}
      <CustomInput {...props} />
    </div>
  );
};

export default InputWithIcon;
