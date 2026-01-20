import { apiServerClient } from "@/lib/axiosServer";
import { getUserServer } from "@/utils/getUserServer";

export async function fetchAccountData() {
  try {
    const user = getUserServer();
    const { data } = await apiServerClient.get(
      `/user/profile-details?userID=${user.id}`
    );

    return data;
  } catch (error) {
    return {};
  }
}
