// Import Core Packages
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

// Import Components
import ForgotPasswordForm from "@/components/Form/ForgotPasswordForm";

// Import Images
import leftGreyArrowIcon from "@/assets/icons/leftGreyArrowIcon.svg";
import splinkLogo from "@/assets/logo/splinkLogo.png";

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
        Forgot Password
      </p>
      <p className="text-center text-lg font-medium text-[#454F5B]">
        No worries, we’ll send you a link to reset your password.
      </p>
      <div className="mt-12 min-w-full sm:min-w-[400px] max-w-[400px]">
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </div>
      <div className="mt-12">
        <Link
          className="flex items-center justify-center gap-x-1.5 text-[#637381] text-sm hover:text-green"
          href="/auth/login"
        >
          <Image
            className="inline-block"
            alt="Logo"
            src={leftGreyArrowIcon}
            width={14}
            height={10}
          />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
