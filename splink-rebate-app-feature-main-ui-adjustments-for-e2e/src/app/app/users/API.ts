import { apiClient } from "@/lib/axiosClient";

export async function cancelUserInvite(
  userId: number | string,
  chainId?: number
) {
  try {
    const { data } = await apiClient.post(`/auth/cancel-user-invite`, {
      userId,
      chainId
    });

    return data;
  } catch (error: any) {
    throw new Error(
      error?.data || "Faced some technical issue for Invitation Cancellation."
    );
  }
}
