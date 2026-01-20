"use client";

import { useEffect, useState } from "react";

// Import Components
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebarWidth: number = 250;
  // const headerHeight: number = 56;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [innerWidth, setInnerWidth] = useState(0);
  const [mounted, setMounted] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeMobileMenu = () => {
    if (window.innerWidth <= 1199) setIsSidebarOpen(false);
  };

  // Automatically open sidebar on desktop and keep it closed on mobile
  useEffect(() => {
    setMounted(true);
    const handleResize = () => {
      setInnerWidth(window.innerWidth);
      if (window.innerWidth >= 1200) {
        // Desktop (xl breakpoint)
        setIsSidebarOpen(true);
      } else {
        // Mobile or tablet
        setIsSidebarOpen(false);
      }
    };

    // Initial check
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Cleanup on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        closeMobileMenu={closeMobileMenu}
        sidebarWidth={sidebarWidth}
        innerWidth={innerWidth}
      />
      <Header
        toggleSidebar={toggleSidebar}
        sidebarWidth={sidebarWidth}
        isSidebarOpen={isSidebarOpen}
      />
      <div className="flex flex-col flex-1 w-full mt-14 overflow-x-auto">
        <main className="flex-1 p-4 sm:p-6 bg-common-bg">{children}</main>
        <Footer />
      </div>
    </>
  );
}
