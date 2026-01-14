import { NextRequest, NextResponse } from "next/server";
import { USER_ROLES } from "./configs/roles";
import { APP_ROUTES } from "./configs/routes";
import { apiUnauthServerClient } from "./lib/axiosServer";
import { SHOW_MAINTENANCE_NOTICE } from "./utils/constants";
import { getUserServer } from "./utils/getUserServer";

const PUBLIC_ROUTES = new Set([APP_ROUTES.login, APP_ROUTES.forget_password]);

const clearCookies = (response: NextResponse, url: string) => {
  const cookiesToClear = [
    "accessToken",
    "refreshToken",
    "superAdminDetails",
    "user",
    "relatedUsers"
  ];
  const expires = new Date(0).toUTCString();
  const domain = new URL(url).hostname;

  const secureFlag = "";
  // Logic to determine if Secure flag should be used in middleware context
  // Example: if your deployed env is always HTTPS, or check an env var
  // For localhost HTTP, secureFlag should remain ""
  // if (process.env.NODE_ENV === 'production') { // Or your specific check for HTTPS env
  //   secureFlag = "Secure;";
  // }
  // For now, assuming local HTTP or conditional logic in setCookie handles client-side:
  // If middleware runs on localhost HTTP, ensure no Secure flag when clearing either.
  // Or, if your `setCookie` on client is conditional, mirror that for clearing.
  // The most straightforward is to ensure your client-side setCookie and middleware clearCookies
  // are consistent regarding the Secure flag for a given environment.

  cookiesToClear.forEach((cookieName) => {
    response.headers.append(
      "Set-Cookie",
      // Ensure attributes here match how they might have been set, especially Path and Domain.
      // Added HttpOnly as middleware is clearing it.
      `${cookieName}=; Path=/; ${secureFlag} SameSite=Lax; Expires=${expires}; Max-Age=0; Domain=${domain}; HttpOnly;`
    );
  });

  // Only set Clear-Site-Data header for HTTPS connections
  const isSecure = url.startsWith("https://");
  if (isSecure) {
    response.headers.set("Clear-Site-Data", '"cookies"');
  }

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
};

const redirectToLogin = (req: any) => {
  const res = NextResponse.redirect(new URL("/auth/login", req.url));
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
};

const redirectToDashboard = (req: any) => {
  const user = getUserServer();
  const res = NextResponse.redirect(
    new URL(
      user.role == USER_ROLES.SUPER_ADMIN
        ? APP_ROUTES.users
        : APP_ROUTES.dashboard,
      req.url
    )
  );
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
};

// Function to refresh the access token using the refresh token
const refreshAccessToken = async (refreshToken: string): Promise<any> => {
  try {
    console.log("Attempting to refresh token...");

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const { data } = await apiUnauthServerClient.post(
      "/auth/refresh-token",
      {
        refreshToken
      },
      {
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    return data;
  } catch (error: any) {
    console.error("Failed to refresh access token:", error);

    // Handle different types of errors
    if (error.name === "AbortError") {
      console.error("Refresh token request timed out");
    } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      console.error("Network error - unable to connect to server");
    } else if (error.response?.status === 401) {
      console.error("Refresh token is invalid or expired");
    } else if (error.response?.status >= 500) {
      console.error("Server error during token refresh");
    }

    console.error("Error details:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
      code: error?.code
    });
    return null;
  }
};

const refreshAndSetCookie = async (req: NextRequest, refreshToken: string) => {
  try {
    const { data } = await refreshAccessToken(refreshToken);

    // The response structure is: data.accessToken (nested data)
    if (data && data.accessToken) {
      const res = NextResponse.redirect(req.nextUrl);

      res.cookies.set("accessToken", data.accessToken, {
        path: "/",
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        domain: req.nextUrl.hostname,
        maxAge: 5184000 // 60 days in seconds to match client-side
      });

      // Set new refresh token if provided
      if (data.refreshToken) {
        res.cookies.set("refreshToken", data.refreshToken, {
          path: "/",
          sameSite: "lax",
          secure: req.nextUrl.protocol === "https:",
          domain: req.nextUrl.hostname,
          maxAge: 5184000 // 60 days in seconds to match client-side
        });
      }

      return res;
    }

    console.error("Invalid refresh token response structure:", data);
    return "EXPIRED";
  } catch (error) {
    console.error("Error refreshing token:", error);
    return "EXPIRED";
  }
};

const validateSession = (
  req: any
): boolean | string | Promise<boolean | string> => {
  try {
    const token = req.cookies.get("accessToken")?.value; // JWT token is stored in cookies
    const refreshToken = req.cookies.get("refreshToken")?.value; // JWT token is stored in cookies
    if (!token || !refreshToken) return false;

    let decodedToken;
    try {
      decodedToken = JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
      // Gracefully handle the error if the token is malformed
      console.error("Failed to decode token:", e);
      return "EXPIRED";
    }

    let decodedRefreshToken;
    try {
      decodedRefreshToken = JSON.parse(atob(refreshToken.split(".")[1]));
    } catch (e) {
      // Gracefully handle the error if the refresh token is malformed
      console.error("Failed to decode refresh token:", e);
      return "EXPIRED";
    }
    // Decode the token
    const isTokenExpired = decodedToken.exp * 1000 < Date.now();
    const isRefreshTokenExpired = decodedRefreshToken.exp * 1000 < Date.now();

    if (isRefreshTokenExpired) return "EXPIRED";
    if (isTokenExpired) return "TOKEN_EXPIRED";

    const user = getUserServer();
    if (!user) {
      return "EXPIRED";
    }

    // Check maintenance mode access
    if (SHOW_MAINTENANCE_NOTICE) {
      // Allow super admin access during maintenance
      if (user.role === USER_ROLES.SUPER_ADMIN) {
        return true;
      }

      // For non-super admin users, check superAdminDetails cookie
      const superAdminDetails = req.cookies.get("superAdminDetails")?.value;
      if (!superAdminDetails) return "EXPIRED";

      let decodedSuperAdminDetails;
      try {
        decodedSuperAdminDetails = JSON.parse(
          atob(superAdminDetails.split(".")[1])
        );
      } catch (e) {
        console.error("Failed to decode superAdminDetails:", e);
        return "EXPIRED";
      }

      // Only allow access if the user is a super admin
      if (decodedSuperAdminDetails.role !== USER_ROLES.SUPER_ADMIN)
        return "EXPIRED";
    }

    // Continue to the page if the token is valid
    return true;
  } catch (error) {
    console.error(
      "Error during token validation (likely parsing 'fake' token):",
      error
    );
    return "EXPIRED";
  }
};

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (auth endpoints)
     * - _next (static files, chunks, css, js, images)
     * - favicon.ico, robots.txt, etc.
     * - public folder assets
     */
    {
      source: "/((?!api/auth|_next|favicon\\.ico|robots\\.txt|public/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" }
      ]
    }
  ]
};

export async function middleware(req: NextRequest) {
  let sessionResult = validateSession(req);
  const currentPath = req.nextUrl.pathname; // Get current path
  const nextMiddleware = NextResponse.next();

  // TODO: Disable Refresh Token Functionality Right now until it's fully implemented and tested
  const ENABLE_REFRESH_TOKEN_FUNCTIONALITY = false;
  if (
    !ENABLE_REFRESH_TOKEN_FUNCTIONALITY &&
    sessionResult === "TOKEN_EXPIRED"
  ) {
    sessionResult = "EXPIRED";
  }

  if (sessionResult === "TOKEN_EXPIRED") {
    const rememberMe = req.cookies.get("rememberMe")?.value;
    const refreshToken = req.cookies.get("refreshToken")?.value;

    if (!refreshToken || rememberMe !== "true") {
      sessionResult = "EXPIRED";
    } else {
      const res = await refreshAndSetCookie(req, refreshToken);
      if (res === "EXPIRED") {
        sessionResult = "EXPIRED";
      } else {
        return res;
      }
    }
  }

  // loginMiddleware is prepared when needed by calling redirectToLogin(req)
  if (sessionResult === "EXPIRED") {
    if (PUBLIC_ROUTES.has(currentPath)) {
      // Check if already on a public route
      const res = NextResponse.next();
      clearCookies(res, req.url); // Ensure clearCookies takes 'res' and works correctly
      return res;
    }
    // Otherwise (on protected route or root), redirect to login.
    const loginRedirect = redirectToLogin(req);
    clearCookies(loginRedirect, req.url); // Ensure clearCookies takes 'loginRedirect'
    return loginRedirect;
  }

  // For app routes - require authentication
  if (req.nextUrl.pathname.startsWith("/app/")) {
    return sessionResult ? nextMiddleware : redirectToLogin(req);
  }

  // For public routes - prevent access if already logged in
  if (PUBLIC_ROUTES.has(req.nextUrl.pathname)) {
    return sessionResult ? redirectToDashboard(req) : nextMiddleware;
  }

  if (APP_ROUTES.root === req.nextUrl.pathname) {
    return sessionResult ? redirectToDashboard(req) : redirectToLogin(req);
  }

  return nextMiddleware;
}
