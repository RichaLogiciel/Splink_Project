import { PERMISSIONS } from "@/configs/permissions";
import { getUserServer } from "./getUserServer";

export const getPermissionsServer = () => {
  const user = getUserServer();

  return PERMISSIONS[user?.role] || null;
};
