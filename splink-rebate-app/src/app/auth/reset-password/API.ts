import { apiServerClient } from "@/lib/axiosServer";

export async function verifyToken(token: string) {
  if (!token) return false;

  try {
    await apiServerClient.get(
      `/auth/validate-password-reset-token?token=${token}`
    );

    return true;
  } catch (error) {
    return false;
  }
}
