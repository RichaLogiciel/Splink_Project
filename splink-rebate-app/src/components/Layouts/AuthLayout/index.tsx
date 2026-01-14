// Import Core Packages
import Image from "next/image";
import "react-toastify/dist/ReactToastify.min.css";

// Import Images
import loginCartIcon from "@/assets/icons/loginCartIcon.svg";
import loginDollerIcon from "@/assets/icons/loginDollerIcon.svg";
import loginUsersGroupIcon from "@/assets/icons/loginUsersGroupIcon.svg";

export default function AuthLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-white min-h-screen min-w-full flex items-center justify-center">
      <div className="w-full h-full flex items-center justify-center">
        {children}
      </div>
      <div className="hidden lg:flex max-w-[650px] w-full h-full login-bg p-12 items-center justify-center">
        <div className="text-center text-white font-medium">
          <p className="text-[32px] mb-5">Welcome to Splink</p>
          <p className="text-[20px]">
            Connecting the information supply chain.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Image
              className=""
              alt="Logo"
              src={loginDollerIcon}
              width={60}
              height={40}
            />
            <Image
              className=""
              alt="Logo"
              src={loginUsersGroupIcon}
              width={60}
              height={40}
            />
            <Image
              className=""
              alt="Logo"
              src={loginCartIcon}
              width={60}
              height={40}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
