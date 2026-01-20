"use client";

import { useWindowWidth } from "@/utils/clientHelper";
import { ENABLE_PROGRAM_EXPIRATION_NOTICE } from "@/utils/constants";
import { Lightbulb } from "lucide-react";
import { APP_ROUTES } from "@/configs/routes";
import Link from "next/link";

interface ProgramExpirationNoticeProps {
  messageType?: string;
  isStoreUser?: boolean;
}

const messageTypes = {
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  INFO: "INFO",
  ERROR: "ERROR",
  CUSTOM: "CUSTOM"
};

const ProgramExpirationNotice = ({
  messageType = "CUSTOM",
  isStoreUser
}: ProgramExpirationNoticeProps) => {
  const windowWidth = useWindowWidth();

  function getColorBasedOnType(type: string) {
    let colorCodes = "";
    switch (type.toLowerCase()) {
      case messageTypes.SUCCESS.toLowerCase():
        colorCodes = "bg-emerald-100 text-emerald-600";
        break;
      case messageTypes.ERROR.toLowerCase():
        colorCodes = "bg-red-100 text-red-600";
        break;
      case messageTypes.WARNING.toLowerCase():
        colorCodes = "bg-yellow-100 text-yellow-600";
        break;
      case messageTypes.INFO.toLowerCase():
        colorCodes = "bg-sky-100 text-sky-600";
        break;
      case messageTypes.CUSTOM.toLowerCase():
        colorCodes = "bg-zinc-50 text-zinc-600";
        break;
      default:
        colorCodes = "bg-white border border-zinc-400 text-zinc-600";
    }

    return colorCodes;
  }

  if (ENABLE_PROGRAM_EXPIRATION_NOTICE) {
    return (
      <>
        {isStoreUser ? (
          <div
            className={`px-3 py-4 mb-4 font-medium ${windowWidth > 600 ? "rounded-sm text-base" : "rounded-md text-sm"} ${getColorBasedOnType(messageType)}`}
          >
            <Lightbulb
              width={20}
              height={20}
              className={`inline mr-1 ${getColorBasedOnType(messageType)}`}
            />
            <p className="inline">
              {" "}
              H1’25 programs have now expired and are no longer active. All
              semi-annual programs have reset and will now begin tracking H2’25.
              To view historical programs, use the filter options available.
            </p>
          </div>
        ) : (
          <div
            className={`px-3 py-4 mb-4 font-medium ${windowWidth > 600 ? "rounded-sm text-base" : "rounded-md text-sm"} ${getColorBasedOnType(messageType)}`}
          >
            <Lightbulb
              width={20}
              height={20}
              className={`inline mr-1 ${getColorBasedOnType(messageType)}`}
            />
            H1’25 programs have now expired and can be seen in the{" "}
            <Link
              href={`${APP_ROUTES.programs}?programTimeline=Historical`}
              className="font-bold underline cursor-pointer"
            >
              Historical
            </Link>{" "}
            section in the programs tab. All semi-annual programs have now reset
            in the system and will begin tracking H2’25
          </div>
        )}
      </>
    );
  }
  return <></>;
};

export default ProgramExpirationNotice;
