"use client";

import React, { useEffect } from "react";
import { toast } from "react-toastify";

const DashboardToast: React.FC<{ showToast: boolean }> = ({ showToast }) => {
  useEffect(() => {
    if (showToast) {
      toast.error("Failed to load data");
    }
  });

  return <div></div>;
};

export default DashboardToast;
