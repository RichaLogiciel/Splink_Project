// Import Core Packages
"use client";
import Image from "next/image";

// Import Components
import LoginForm from "@/components/Form/LoginForm";

// Import Images
import splinkLogo from "@/assets/logo/splinkLogo.png";
import { Suspense } from "react";

const LoginPage = () => {
  return (
    <div className="p-6 sm:p-10 flex items-center flex-col w-full sm:w-auto">
      <Image
        className="inline-block"
        alt="Logo"
        src={splinkLogo}
        width={148}
        height={46}
      />
      <p className="mt-7 mb-4 text-center font-bold text-[#131315] text-3xl">
        Welcome back
      </p>
      <p className="text-center text-lg font-medium text-[#454F5B]">
        Please sign in to your account
      </p>
      <div className="mt-12 min-w-full sm:min-w-[400px] max-w-[400px]">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
};

export default LoginPage;
