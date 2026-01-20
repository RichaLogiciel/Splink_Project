import { APP_ROUTES } from "@/configs/routes";
import { LoginResponseData, RelatedUsers, UserCookie } from "@/types/UsersType";
import { getCookie } from "./getCookie";
import { setCookie } from "./setCookie";

export const getUserClient = () => {
  const user = JSON.parse(getCookie("user") || "null") as UserCookie | null;
  if (user?.logo) {
    user.logo = localStorage.getItem("userLogo") || "";
  }

  return user;
};

export const getRelatedUsersClient = () => {
  try {
    const relatedUsersCookie = getCookie("relatedUsers");
    if (!relatedUsersCookie) return null;

    const relatedUsers = JSON.parse(relatedUsersCookie) as
      | RelatedUsers[]
      | null;
    return relatedUsers;
  } catch (error) {
    console.error("Error parsing related users from cookie:", error);
    // Remove potentially corrupted cookie
    setCookie("relatedUsers", "");
    return null;
  }
};

export const updateUserCookieClient = ({
  firstName,
  lastName,
  logo,
  orgName
}: {
  firstName?: string;
  lastName?: string;
  logo?: string;
  orgName?: string;
}): UserCookie | null => {
  try {
    const user = getUserClient();

    if (!user) {
      return null;
    }

    // Update values only if they are provided
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (orgName) user.name = orgName;
    if (logo) {
      user.logo = logo;
      localStorage.setItem("userLogo", logo);
    }

    // Save back to cookie
    setCookie("user", JSON.stringify(user));

    return user;
  } catch (error) {
    console.error("Error updating user details:", error);
    return null;
  }
};

// Check if Super Admin is Impersonating as User
export const isImpersonating = () => {
  try {
    const cookie = getCookie("superAdminDetails");
    const user = JSON.parse(cookie || "null") as LoginResponseData | null;
    if (user?.accessToken) return true;
    return false;
  } catch (error) {
    return false;
  }
};

// For User Impersonation
export const loginAsUser = (data: LoginResponseData) => {
  const { accessToken, refreshToken, user, relatedUsers } = data;

  // Set Super Admin Cookie first
  setCookie(
    "superAdminDetails",
    JSON.stringify({
      accessToken: getCookie("accessToken"),
      refreshToken: getCookie("refreshToken"),
      user: getCookie("user"),
      userLogo: getCookie("userLogo")
    })
  );

  // Store user token in cookies
  setCookie("accessToken", accessToken);
  setCookie("refreshToken", refreshToken);
  setCookie("user", JSON.stringify(user));
  setCookie("relatedUsers", JSON.stringify(relatedUsers));
  localStorage.setItem("userLogo", user?.logo || "");

  location.replace(APP_ROUTES.dashboard);
};

// For Account Switch Impersonation
export const switchAccount = (data: LoginResponseData) => {
  const { accessToken, refreshToken, user, relatedUsers } = data;

  // Store user token in cookies
  setCookie("accessToken", accessToken);
  setCookie("refreshToken", refreshToken);
  setCookie("user", JSON.stringify(user));
  setCookie("relatedUsers", JSON.stringify(relatedUsers));

  // Store logo in localStorage for consistency with the rest of the app
  localStorage.setItem("userLogo", user?.logo || "");

  // Redirect to dashboard
  location.replace(APP_ROUTES.dashboard);
};

// Login Back as Super Admin
export const logoutAsUser = () => {
  try {
    const SuperAdminCookie = getCookie("superAdminDetails");
    const { accessToken, refreshToken, user } = JSON.parse(SuperAdminCookie);

    // Store token in cookies
    setCookie("superAdminDetails", "");
    setCookie("relatedUsers", "");
    setCookie("accessToken", accessToken);
    setCookie("refreshToken", refreshToken);
    setCookie("user", user);
    localStorage.setItem("userLogo", user?.logo || "");

    // Wait for 500ms to ensure the cookie is cleared
    setTimeout(() => {
      location.replace(APP_ROUTES.users);
    }, 500);
    return;
  } catch (error) {
    console.error(error);
    location.replace(APP_ROUTES.login);
  }
};
