"use client";

// Import Core Packages
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

// Import Configs
import { USER_ROLES } from "@/configs/roles";
// import { APP_ROUTES } from "@/configs/routes";

// Import Libs
import { apiClient } from "@/lib/axiosClient";
import { identifyUser, initMixpanel } from "@/lib/mixpanelClient";

// Import Types & Interfaces
type Inputs = {
  email: string;
  password: string;
};

// Import Images
import loginSigninIcon from "@/assets/icons/loginSigninIcon.svg";
import { handleAuthSuccess } from "@/utils/auth";
import {
  MAINTENANCE_NOTICE_MESSAGE,
  SHOW_MAINTENANCE_NOTICE
} from "@/utils/constants";
// import { getCookie } from "@/utils/getCookie";
// import { convertExpiresInToMilliseconds } from "@/utils/helper";
import { setCookie } from "@/utils/setCookie";

const validateEmail = (value: string) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  if (!emailRegex.test(value)) {
    return "Email address is not valid";
  }

  return true;
};

const LoginForm = () => {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState(
    searchParams?.get("SHOW_MAINTENANCE_NOTICE")
      ? MAINTENANCE_NOTICE_MESSAGE
      : ""
  );
  const [timeoutState, setTimeoutState] = useState<any>();
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  useEffect(() => {
    // rememberMeLogin();
    setShowLoginForm(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // function rememberMeLogin() {
  //   const showLogin = () => {
  //     clearCookies();
  //     setShowLoginForm(true);
  //   };

  //   const cookies = ["loginTime", "expiresIn", "rememberMe", "user"].map(
  //     getCookie
  //   );

  //   if (cookies.every(Boolean)) {
  //     const [loginTime, expiresIn, userCookie] = cookies;

  //     const date = new Date(loginTime);

  //     if (isNaN(date.getTime())) {
  //       showLogin();
  //       return;
  //     }

  //     const loginDate = date.getTime();
  //     const formattedExpiresIn = convertExpiresInToMilliseconds(expiresIn);

  //     if (loginDate + formattedExpiresIn < Date.now()) {
  //       showLogin();
  //       return;
  //     }

  //     const user = JSON.parse(userCookie);

  //     if (user) {
  //       location.replace(
  //         user.role === USER_ROLES.SUPER_ADMIN
  //           ? APP_ROUTES.users
  //           : APP_ROUTES.dashboard
  //       );

  //       return;
  //     }
  //   }

  //   showLogin();
  // }

  function clearCookies() {
    setCookie("loginTime", "");
    setCookie("expiresIn", "");
    setCookie("rememberMe", false);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // function clearCookies() {
  //   // This function is used in the commented out rememberMeLogin function
  // }

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRememberMe(event.target.checked);
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);
    clearInterval(timeoutState);

    const timeoutTime = 15000;

    try {
      const response: any = await apiClient.post("/auth/login", {
        email: data.email.toLowerCase(), // Ensure email is lowercase
        password: data.password,
        rememberMe
      });

      const { user } = response?.data || response;

      if (SHOW_MAINTENANCE_NOTICE && user.role !== USER_ROLES.SUPER_ADMIN) {
        setLoginStatus(MAINTENANCE_NOTICE_MESSAGE);
        return;
      }

      // Use the common auth success function
      handleAuthSuccess(
        response,
        rememberMe,
        initMixpanel,
        identifyUser,
        location
      );
    } catch (res: any) {
      if (res?.success === false && res?.status === 429) {
        setLoginStatus(
          res.message ||
            "We're experiencing some technical issues at the moment"
        );
      } else {
        setLoginStatus(
          res?.data ||
            "We're experiencing some technical issues at the moment. Please try again shortly or contact support if the problem persists."
        );
      }
    } finally {
      setTimeout(() => setIsLoading(false), 500);
      setTimeoutState(setTimeout(() => setLoginStatus(""), timeoutTime));
    }
  };

  return (
    <>
      {showLoginForm ? (
        <form
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit)}
          method="post"
        >
          <div className="mb-5">
            <label className="mb-2 block text-xs" htmlFor="email">
              Email
            </label>
            <input
              {...register("email", {
                required: "Email address is required",
                validate: validateEmail,
                shouldUnregister: true,
                setValueAs: (value: string) => value.toLowerCase()
              })}
              id="email"
              name="email"
              autoComplete="new-username"
              className="text-sm border rounded text-highlighted-color placeholder:heading-very-light border-border-gray p-3.5 outline-none block w-full disabled:opacity-70"
              type="text"
              disabled={isLoading}
              placeholder="Please enter email address"
              defaultValue={""}
              onInput={(e) => {
                // Force lowercase as user types
                e.currentTarget.value = e.currentTarget.value.toLowerCase();
              }}
            />
            {errors.email && (
              <span className="text-xs text-[#FF1010]">
                {errors.email.message}
              </span>
            )}
          </div>
          <div className="mb-5">
            <label className="mb-2 block text-xs" htmlFor="password">
              Password
            </label>
            <input
              {...register("password", {
                required: "Password is required",
                shouldUnregister: true
              })}
              className="text-sm border rounded text-highlighted-color placeholder:heading-very-light border-border-gray p-3.5 outline-none block w-full disabled:opacity-70"
              id="user-password"
              name="password"
              autoComplete="new-password"
              disabled={isLoading}
              type="password"
              placeholder="*********"
              defaultValue={""}
            />
            {errors.password && (
              <span className="text-xs text-[#FF1010]">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="mb-4 flex justify-between text-sm">
            <div className="checkout flex gap-1.5">
              <input
                className="cursor-pointer disabled:opacity-70"
                type="checkbox"
                id="rememberMe"
                disabled={isLoading}
                onChange={handleCheckboxChange}
              />
              <label className="cursor-pointer" htmlFor="rememberMe">
                Remember me
              </label>
            </div>
            <Link className="text-green" href="/auth/forget-password">
              Forgot password?
            </Link>
          </div>
          {loginStatus && (
            <p className="mb-[-16px] text-xs font-medium text-[#FF1010]">
              {loginStatus}
            </p>
          )}
          <div className="mt-7">
            <button
              disabled={isLoading}
              className="w-full flex gap-2 justify-center items-center bg-green text-white px-4 py-3.5 rounded-md hover:bg-opacity-90 text-sm font-medium disabled:opacity-70"
              type="submit"
            >
              <Image alt="Logo" src={loginSigninIcon} width={17} height={18} />
              Sign In
            </button>
          </div>
        </form>
      ) : (
        <></>
      )}
    </>
  );
};

export default LoginForm;
