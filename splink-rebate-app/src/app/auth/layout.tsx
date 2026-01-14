"use client";
import { useEffect, useState } from "react";

// import { USER_ROLES } from "@/configs/roles";
// import { APP_ROUTES } from "@/configs/routes";
import { getCookie } from "@/utils/getCookie";
import { getUserClient } from "@/utils/getUserClient";

import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import AuthLayout from "@/components/Layouts/AuthLayout";
import {
  MAINTENANCE_NOTICE_MESSAGE,
  SHOW_MAINTENANCE_NOTICE
} from "@/utils/constants";
import Image from "next/image";

const MaintenanceNotice = () => {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center select-none">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 text-center relative">
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close maintenance banner"
        >
          <Image src={popupCloseIcon} alt="Close" />
        </button>
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Maintenance Notice
        </h1>
        <p className="text-gray-700 mb-4">{MAINTENANCE_NOTICE_MESSAGE}</p>
        <p className="text-sm text-gray-500">
          We apologize for any inconvenience.
        </p>
      </div>
    </div>
  );
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // No direct client-side redirect here initially. Middleware should handle.

  useEffect(() => {
    // This effect primarily helps in scenarios like bfcache or if the user navigates
    // back to the login page while client-side state still indicates they are logged in.
    // The middleware is the primary guard for initial loads.
    const user = getUserClient();
    const accessToken = getCookie("accessToken");

    if (accessToken && user?.role) {
      // If client-side indicates logged in, and we are on an auth page,
      // the ideal scenario is that middleware would have already redirected.
      // This state update is more for UI consistency if somehow landed here.
      // Consider if a redirect is truly needed here or if middleware covers it.
      // For now, let's prevent rendering children if client thinks it's auth.
      // This avoids showing login form flicker if already logged in.
      setIsLoading(false); // Indicate loading is done, but AuthLayout might not show children
      // if it has its own logic based on a global auth state.
      // The key is to avoid location.replace() here if it causes a loop.
    } else {
      setIsLoading(false);
    }

    // Optional: A pageshow listener can re-evaluate if necessary,
    // but be cautious about causing redirects from here.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Potentially re-check auth, but avoid aggressive redirects
        const freshUser = getUserClient();
        const freshToken = getCookie("accessToken");
        if (!(freshToken && freshUser?.role)) {
          setIsLoading(false); // Allow rendering children (login form)
        }
        // If they are authenticated, middleware should handle redirect from auth page
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  // The AuthLayout component itself might have further logic to hide children
  // if a global auth context/store indicates the user is logged in.
  return (
    <>
      {SHOW_MAINTENANCE_NOTICE && <MaintenanceNotice />}
      <AuthLayout>{children}</AuthLayout>
    </>
  );
}
