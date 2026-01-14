import SplinkLogo from "@/assets/logo/splink.png";
import Image from "next/image";

export default function ProfileSetupLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-white w-full relative pb-24">
      <div className=" bg-[#F3F8F9] absolute h-80 w-full top-0 left-0 -z-1"></div>
      <div className="max-w-[1352px] px-4 mx-auto relative">
        <div className="logo mt-11 mb-10">
          <Image
            src={SplinkLogo.src}
            alt="Splink Logo"
            height={39}
            width={121}
          />
        </div>
        <div className="max-w-[910px] w-full mx-auto">
          <h2 className="font-semibold text-2xl text-[#333]">Set Up Profile</h2>
          <p className="mt-1 mb-4 text-sm">
            We&apos;re thrilled to have you join our platform! Please add your
            details
          </p>
          <div className="card rounded-xl shadow-setup-profile-card bg-white">
            <div className="mx-auto py-8 px-6 md:py-20 md:px-36">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
