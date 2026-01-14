// Import Core Packages
import { APP_ROUTES } from "@/configs/routes";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyToken } from "./API";

// Import Components
import ResetPasswordForm from "@/components/Form/ResetPasswordForm";

// Import Images
import leftGreyArrowIcon from "@/assets/icons/leftGreyArrowIcon.svg";
import splinkLogo from "@/assets/logo/splinkLogo.png";

export interface PasswordResetPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const PasswordResetPage = async ({ searchParams }: PasswordResetPageProps) => {
  const token = (searchParams?.token || "") as string;

  const isTokenValid = await verifyToken(token);

  if (!isTokenValid) {
    redirect(APP_ROUTES.forget_password + "?err=IPRT");
  }

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
        Set New Password
      </p>
      <p className="text-center text-lg font-medium text-[#454F5B]">
        Please create a new password
      </p>
      <div className="mt-12 min-w-full sm:min-w-[400px] max-w-[400px]">
        <ResetPasswordForm token={token} />
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

export default PasswordResetPage;
