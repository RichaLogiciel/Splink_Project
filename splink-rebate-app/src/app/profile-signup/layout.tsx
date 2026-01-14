import ProfileSetupLayout from "@/components/Layouts/ProfileSetup";

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProfileSetupLayout>{children}</ProfileSetupLayout>;
}
