import { apiClient } from "@/lib/axiosClient";
import { setCookie } from "./setCookie";

export const logout = async () => {
  try {
    await apiClient.post("/user/logout");
  } catch {
    // Handle error here
  }

  setCookie("accessToken", "");
  setCookie("user", "");
  setCookie("relatedUsers", "");
  setCookie("refreshToken", "");
  setCookie("loginTime", "");
  setCookie("expiresIn", "");
  setCookie("rememberMe", false);
  localStorage.removeItem("userLogo");
  if (window) window.location.reload();
};
