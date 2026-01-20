"use client";

import { ToastContainer } from "react-toastify";

// Styles
import "@/app/globals.scss";
import "react-toastify/dist/ReactToastify.min.css";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Splink</title>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased flex min-h-screen bg-common-bg font-inter">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
        {children}
      </body>
    </html>
  );
}
