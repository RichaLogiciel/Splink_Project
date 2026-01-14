"use client";
// Core|Package imports
import Image from "next/image";

// Import components
import CardButton from "../CardButton";

// Imported Images
import { useRouter } from "next/navigation";
import AddIcon from "../../assets/icons/plusWhiteIcon.svg";

export type CreateNewProgramDistributor = {
  userId: number;
  associatedUserId: number;
  name: string;
};

interface CreateNewProgramProps {
  label?: string;
  showIcon?: boolean;
  referenceId?: string;
}

export default function CreateNewProgram({
  label = "Create new program",
  showIcon = true,
  referenceId
}: CreateNewProgramProps) {
  const router = useRouter();

  return (
    <>
      <CardButton
        onClick={() =>
          router.push(
            referenceId
              ? `/app/programs/create?referenceId=${referenceId}`
              : "/app/programs/create"
          )
        }
        className="border border-border-gray bg-green min-w-28 p-[8px]"
      >
        <div className="flex gap-2 justify-center">
          {showIcon && (
            <Image
              height={11.5}
              width={13}
              src={AddIcon.src}
              alt="Download Icon"
            />
          )}
          <div className="text-white text-xs">{label}</div>
        </div>
      </CardButton>
    </>
  );
}
