"use client";
// Import Core Packages
import { apiClient } from "@/lib/axiosClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import infoIcon from "@/assets/icons/info.svg";
import PasswordValidationPopOver from "@/components/Dialog/PasswordValidation";
import NextImage from "next/image";

// Import Types & Interfaces
type Inputs = {
  password: string;
  confirmPassword: string;
};

type ResetPasswordForm = {
  token: string;
};

const ResetPasswordForm = ({ token }: ResetPasswordForm) => {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [changeStatus, setChangeStatus] = useState(false);
  const [timeoutState, setTimeoutState] = useState<any>();

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  useEffect(() => {
    if (password && confirmPassword != "") {
      // Trigger validation for confirmPassword whenever password changes
      trigger("confirmPassword");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const [isPopOverOpen, setIsPopOverOpen] = useState(false);
  const togglePopOver = () => setIsPopOverOpen(!isPopOverOpen);

  const timeoutTime = 7000;

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    clearInterval(timeoutState);
    setIsLoading(true);

    try {
      await apiClient.post(`/auth/reset-password`, {
        token,
        newPassword: data.password
      });

      // Sample validation to be replace with actual login logic
      setTimeoutState(
        setFormMessage(
          "Your password has been updated. Please login again with new password."
        )
      );
      setChangeStatus(true);
      toast.success("Redirecting you to login page.");

      setTimeout(() => router.push("/auth/login"), timeoutTime);
    } catch (error: any) {
      setChangeStatus(false);
      setFormMessage(
        error?.data || "Unable to set new password. Contact support if needed."
      );
      setTimeoutState(setTimeout(() => setFormMessage(""), timeoutTime));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      method="post"
      className={isLoading ? "opacity-60" : ""}
    >
      {!changeStatus && (
        <>
          <div className="mb-5 relative">
            <label className="mb-2 block text-xs" htmlFor="password">
              Password
            </label>
            <input
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                },
                validate: {
                  uppercase: (value) =>
                    /[A-Z]/.test(value) ||
                    "Password must contain at least one uppercase letter",
                  number: (value) =>
                    /\d/.test(value) ||
                    "Password must contain at least one number",
                  specialCharacter: (value) =>
                    /[\W_]/.test(value) ||
                    "Password must contain at least one special character"
                }
              })}
              id="password"
              autoComplete="password"
              className="text-sm border rounded text-highlighted-color placeholder:heading-very-light border-border-gray p-3.5 outline-none block w-full pr-8"
              type="password"
              placeholder="*****************"
            />
            <NextImage
              className="absolute top-10 right-3 cursor-pointer"
              src={infoIcon.src}
              alt="infoIcon"
              width={14}
              height={14}
              onMouseOver={togglePopOver}
              onMouseLeave={togglePopOver}
            />
            {isPopOverOpen && (
              <PasswordValidationPopOver className="-top-20 right-0" />
            )}
            {errors.password && (
              <span className="text-xs text-[#FF1010]">
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-xs" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              {...register("confirmPassword", {
                required: "Confirm Password is required",
                validate: (value) =>
                  value === password ||
                  "Confirm password must be matched with password."
              })}
              id="confirmPassword"
              autoComplete="confirmPassword"
              className="text-sm border rounded text-highlighted-color placeholder:heading-very-light border-border-gray p-3.5 outline-none block w-full"
              type="password"
              placeholder="*****************"
            />
            {errors.confirmPassword && (
              <span className="text-xs text-[#FF1010]">
                {errors.confirmPassword.message}
              </span>
            )}
          </div>
        </>
      )}
      {formMessage && (
        <p
          className={`font-medium ${
            changeStatus
              ? "text-green text-md text-center"
              : "text-[#FF1010] text-xs"
          }`}
        >
          {formMessage}
        </p>
      )}
      {!changeStatus && (
        <div className="mt-7">
          <button
            disabled={isLoading}
            className="w-full flex gap-2 justify-center items-center bg-green text-white px-4 py-3.5 rounded-md hover:bg-opacity-90 text-sm font-medium"
            type="submit"
          >
            Reset Password
          </button>
        </div>
      )}
    </form>
  );
};

export default ResetPasswordForm;
