"use client";

// Default/Core Imports
import { apiClient } from "@/lib/axiosClient";
import { StoreProfileDetails } from "@/types/StoreTypes";
import React, { useState } from "react";
import { SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";

// Import Components
import StoreProfileForm from "@/components/Form/StoreProfile";
import { identifyUser, initMixpanel } from "@/lib/mixpanelClient";
import { handleAuthSuccess } from "@/utils/auth";

interface Inputs {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  storeName?: string;
}

interface StoreProfileSignupProps {
  token: string;
  email: string;
  storeDetails: StoreProfileDetails | null;
}

const StoreProfileSignup: React.FC<StoreProfileSignupProps> = ({
  token,
  email: defaultEmail,
  storeDetails
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);
    const { ...newData } = data;

    try {
      const params = {
        token: token,
        phones: [data.phoneNumber],
        ...newData
      };
      // Send API Req
      const response: any = await apiClient.post("/auth/signup", params);

      toast.success(
        "Profile created successfully! You can now log in using your new account credentials."
      );

      // Use the common auth success function
      handleAuthSuccess(response, false, initMixpanel, identifyUser, location);
    } catch (error: any) {
      toast.error(
        error?.data || "Failed to create your account. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StoreProfileForm
      isLoading={isLoading}
      onSubmit={onSubmit}
      defaultEmail={defaultEmail}
      showPasswordField
      defaultValues={storeDetails}
    />
  );
};

export default StoreProfileSignup;
