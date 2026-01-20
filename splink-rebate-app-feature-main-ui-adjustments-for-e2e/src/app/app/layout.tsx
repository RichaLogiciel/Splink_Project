"use client";

import { initMixpanel } from "@/lib/mixpanelClient";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import TimeTracker from "@/components/TimeTracker";
import { CartProvider } from "@/contexts/CartContext";
import { FilterChangeProvider } from "@/contexts/FilterChangeContext";

export const dynamic = "force-dynamic";

import AppLayout from "@/components/Layouts/AppLayout";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const pageName = pathname.split("/").pop() || "home";

  useEffect(() => {
    // Initialize Mixpanel as soon as possible
    initMixpanel();
  }, []); // Empty dependency array means this runs once on mount
  return (
    <>
      <TimeTracker pageName={pageName} />
      <CartProvider>
        <FilterChangeProvider>
          <AppLayout>{children}</AppLayout>
        </FilterChangeProvider>
      </CartProvider>
    </>
  );
}
