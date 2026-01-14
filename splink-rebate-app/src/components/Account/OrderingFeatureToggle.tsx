"use client";

import ToggleSwitch from "@/core-ui/ToggleSwitch";
import { updateOrderingFeaturePreference } from "@/services/api/user";
import { enableOrderingFeature } from "@/utils/featureHelper";
import { getUserClient } from "@/utils/getUserClient";
import { isOrderAndCartFeatureEnabled } from "@/utils/helper";
import { getOrderingFeaturePreference } from "@/utils/orderingFeaturePreference";
import { setCookie } from "@/utils/setCookie";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const OrderingFeatureToggle: React.FC = () => {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shouldShow, setShouldShow] = useState<boolean>(false);

  useEffect(() => {
    const user = getUserClient();

    if (!user || !user.associatedUserId) {
      setIsLoading(false);
      setShouldShow(false);
      return;
    }

    const { associatedUserId, parentEntityId } = user;

    // Check if distributor is enabled - if not, don't show toggle
    if (parentEntityId !== undefined) {
      const isDistributorEnabled = isOrderAndCartFeatureEnabled(parentEntityId);
      if (!isDistributorEnabled) {
        setIsLoading(false);
        setShouldShow(false);
        return;
      }
    }

    setShouldShow(true);

    // Get current preference from user cookie
    const userPreference = getOrderingFeaturePreference(associatedUserId);

    if (userPreference !== null) {
      // User has set a preference, use it
      setIsEnabled(userPreference);
    } else {
      // No preference set, calculate from default logic
      const defaultEnabled = enableOrderingFeature(
        associatedUserId,
        parentEntityId ?? undefined
      );
      setIsEnabled(defaultEnabled);
    }

    setIsLoading(false);
  }, []);

  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const user = getUserClient();

    if (!user || !user.associatedUserId) {
      return;
    }

    const newValue = event.target.checked;
    const previousValue = isEnabled;

    // Update state immediately for optimistic UI update
    setIsEnabled(newValue);

    try {
      // Call API to update user_meta table
      await updateOrderingFeaturePreference(newValue);

      // Update cookie to reflect the change immediately
      const updatedUser = {
        ...user,
        orderingFeatureEnabled: newValue
      };
      // Update cookie using setCookie utility
      setCookie("user", JSON.stringify(updatedUser));

      // Refresh the page to ensure all components use the updated preference
      router.refresh();
    } catch (error) {
      // Revert state on error
      setIsEnabled(previousValue);
      console.error("Failed to update ordering feature preference:", error);
      // Optionally show error message to user
      alert("Failed to update ordering feature preference. Please try again.");
    }
  };

  // Don't render if distributor is not enabled or user is not available
  if (isLoading || !shouldShow) {
    return null;
  }

  return (
    <div className="pb-4 min-h-[86px] mb-4 border-b border-border-gray grid gap-4 grid-cols-1 sm:grid-cols-3 sm:items-center">
      <p className="title font-semibold text-base">Ordering Feature</p>
      <div className="col-span-2">
        <ToggleSwitch
          id="ordering-feature-toggle"
          checked={isEnabled}
          onChange={handleToggle}
          // label="Enable ordering functionality"
          size="md"
        />
      </div>
    </div>
  );
};

export default OrderingFeatureToggle;
