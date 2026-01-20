import { apiServerClient } from "@/lib/axiosServer";
import { StoreProfileDetails } from "@/types/StoreTypes";

export async function getInvitation(token: string) {
  if (!token) return false;
  try {
    const { data } = await apiServerClient.get(
      `/auth/invitation?token=${token}`
    );

    return data;
  } catch (error) {
    return false;
  }
}

export async function fetchStoreInvitationDetails(
  token: string
): Promise<StoreProfileDetails | null> {
  if (!token) return null;

  try {
    const { data } = await apiServerClient.get(
      `/auth/invite-existing-user?token=${token}`
    );

    const formattedData: StoreProfileDetails = {
      firstName: data?.user?.firstName || "",
      lastName: data?.user?.lastName || "",
      email: data?.user?.email || "",
      phone: data?.user?.phone || "",
      address: data?.user?.address || "",
      state: data?.user?.state || "",
      city: data?.user?.city || "",
      zip: data?.user?.zip || "",
      storeName: data?.user?.userRole?.store?.storeName || ""
    };

    return formattedData;
  } catch (error) {
    return null;
  }
}

export async function fetchInvitationDetails(
  token: string
): Promise<any | null> {
  if (!token) return null;

  try {
    const { data } = await apiServerClient.get(
      `/auth/invite-existing-user?token=${token}`
    );

    return data;
  } catch (error) {
    return null;
  }
}
