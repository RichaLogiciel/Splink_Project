// /utils/auth.ts

import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import { SHOW_MAINTENANCE_NOTICE } from "./constants";
import { setCookie } from "./setCookie";

type InitMixpanelFunction = () => void;

export const handleAuthSuccess = (
  response: any,
  rememberMe: boolean,
  initMixpanel: InitMixpanelFunction,
  identifyUser: (userData: {
    userId: number;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
    orgName: string;
  }) => void,
  location: Location
) => {
  const {
    accessToken,
    refreshToken,
    user,
    loginTime,
    expiresIn,
    relatedUsers
  } = response?.data || response;

  if (SHOW_MAINTENANCE_NOTICE && user.role !== USER_ROLES.SUPER_ADMIN) {
    // query param
    const queryParams = new URLSearchParams({
      SHOW_MAINTENANCE_NOTICE: "true"
    }).toString();

    location.assign(`${APP_ROUTES.login}?${queryParams}`);
    return;
  }

  // Store token in cookies
  setCookie("accessToken", accessToken);
  setCookie("refreshToken", refreshToken);
  setCookie("user", JSON.stringify(user));
  setCookie("relatedUsers", JSON.stringify(relatedUsers));
  localStorage.setItem("userLogo", user?.logo || "");

  setCookie("loginTime", rememberMe ? loginTime : "");
  setCookie("expiresIn", rememberMe ? expiresIn : "");
  setCookie("rememberMe", rememberMe);

  // Initialize Mixpanel and identify user
  initMixpanel();
  identifyUser({
    userId: user.id,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    orgName: user.name
  });

  // Redirect to the dashboard page after successful login
  location.assign(
    user.role === USER_ROLES.SUPER_ADMIN
      ? APP_ROUTES.users
      : APP_ROUTES.dashboard
  );
};
