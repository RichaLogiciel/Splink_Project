"use client";

// Default/Core Imports
import { apiClient } from "@/lib/axiosClient";
import React, { useState } from "react";
import { SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";

// Import Components

import { identifyUser, initMixpanel } from "@/lib/mixpanelClient";
import { handleAuthSuccess } from "@/utils/auth";
import SalesRepProfile from "../SalesRepProfile";

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
}

interface StoreProfileSignupProps {
  token: string;
  email: string;
  salesRepDetails: any | null;
}

const DistributorSalesRepProfileSignup: React.FC<StoreProfileSignupProps> = ({
  token,
  email: defaultEmail,
  salesRepDetails
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, ...newData } = data;
    try {
      const params = {
        email: defaultEmail,
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
    <SalesRepProfile
      isLoading={isLoading}
      onSubmit={onSubmit}
      defaultEmail={defaultEmail}
      showPasswordField={true}
      user={salesRepDetails?.user}
    />
  );
};

export default DistributorSalesRepProfileSignup;
