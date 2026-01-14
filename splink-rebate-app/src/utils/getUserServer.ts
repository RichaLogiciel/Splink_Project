import { cookies } from "next/headers";

export const getUserServer = () => {
  const cookieStore = cookies();

  const user = JSON.parse(cookieStore.get("user")?.value || "null");

  return user;
};
