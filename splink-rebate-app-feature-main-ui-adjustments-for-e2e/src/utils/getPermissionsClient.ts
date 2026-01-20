import { PERMISSIONS } from "@/configs/permissions";
import { getUserClient } from "./getUserClient";

export const getPermissionsClient = () => {
  const user: any = getUserClient();

  return PERMISSIONS[user?.role] || null;
};
