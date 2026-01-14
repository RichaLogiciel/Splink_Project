"use client";

import { useFilterChange } from "@/contexts/FilterChangeContext";
import {
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  PROGRAM_TIMELINE,
  SHOW_PROGRAM_ON_TIMELINE_BASE
} from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributorFeatureEnabled } from "@/utils/helper";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ProgramTimelineOptionSelector = ({
  className
}: {
  className?: string;
}) => {
  const user = getUserClient();
  const router = useRouter();
  const searchParams = useSearchParams() as unknown as any;

  /*
   * TEMPORARY CODE FOR DEFAULT UPCOMING ENABLED FOR DISTRIBUTOR
   * WILL BE REMOVED AFTER DEFAULT UPCOMING ENABLED FOR
   * DISTRIBUTOR IS IMPLEMENTED FOR ALL DISTRIBUTORS
   */
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;

  // Check if default upcoming is enabled for distributor
  const defaultUpcomingEnabled = isDistributorFeatureEnabled(
    distributorId,
    DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const programTimeline =
    searchParams.get("programTimeline") ||
    (defaultUpcomingEnabled ? "Upcoming" : "");
  /** TEMP CODE ENDS HERE */

  const [selected, setSelected] = useState<string>("");

  const options = Object.values(PROGRAM_TIMELINE);
  const { setFilterChanging } = useFilterChange();

  useEffect(() => {
    const queryParams = new URLSearchParams(searchParams.toString());
    const programTimeline = queryParams.get("programTimeline");

    if (!selected) {
      if (programTimeline) setSelected(programTimeline);
      return;
    }

    if (selected?.toLowerCase() == programTimeline?.toLowerCase()) return;

    switch (selected.toLowerCase()) {
      case PROGRAM_TIMELINE.UPCOMING.toLowerCase():
        defaultUpcomingEnabled
          ? queryParams.delete("programTimeline")
          : queryParams.set("programTimeline", "Upcoming");
        break;
      case PROGRAM_TIMELINE.HISTORICAL.toLowerCase():
        queryParams.set("programTimeline", "Historical");
        break;
      case PROGRAM_TIMELINE.CURRENT.toLowerCase():
        defaultUpcomingEnabled
          ? queryParams.set("programTimeline", "Current")
          : queryParams.delete("programTimeline");
        break;
      default:
        queryParams.delete("programTimeline");
    }

    // Update the URL first
    router.push(`${window.location.pathname}?${queryParams.toString()}`);
  }, [selected]);

  return (
    <>
      {SHOW_PROGRAM_ON_TIMELINE_BASE && (
        <div
          className={`flex gap-2 text-sm font-medium items-center text-highlighted-color ${className}`}
        >
          <select
            id="programTimelineSelector"
            value={selected || programTimeline}
            onChange={(e) => {
              // Immediately signal that filter is changing (before router.push)
              setFilterChanging(true);
              setSelected(e.target.value);
            }}
            className="text-xs outline-none rounded p-2 border border-border-gray"
          >
            {options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
};

export default ProgramTimelineOptionSelector;
