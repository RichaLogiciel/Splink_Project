import { cookies } from "next/headers";

export const getAuthHeaders = () => {
  const cookieStore = cookies();

  const token = cookieStore.get("accessToken")?.value;

  return {
    Authorization: `Bearer ${token}`
  };
};
