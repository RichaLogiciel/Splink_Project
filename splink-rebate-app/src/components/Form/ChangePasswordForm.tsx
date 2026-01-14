"use client";
// Import Core Packages
import { apiClient } from "@/lib/axiosClient";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

import infoIcon from "@/assets/icons/info.svg";
import PasswordValidationPopOver from "@/components/Dialog/PasswordValidation";
import NextImage from "next/image";

// Import Types & Interfaces
type Inputs = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

const ChangePasswordForm = () => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    reset,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const currentPassword = watch("currentPassword");
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

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);

    try {
      await apiClient.put(`/user/update-password`, {
        currentPassword: data.currentPassword,
        password: data.password,
        confirmPassword: data.confirmPassword
      });

      toast.success(
        "Your password has been updated. Please login again with new password."
      );
      reset();
    } catch (error: any) {
      const message =
        error?.data || "Unable to update password. Contact support if needed.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      method="post"
      className={`mt-10 ${isLoading ? "opacity-60" : ""}`}
    >
      <div className="mb-5 relative">
        <label className="mb-2 block text-xs" htmlFor="currentPassword">
          Current Password
        </label>
        <input
          {...register("currentPassword", {
            required: "Current Password is required",
            minLength: {
              value: 8,
              message: "Password must be at least 8 characters"
            },
            validate: {
              uppercase: (value) =>
                /[A-Z]/.test(value) ||
                "Password must contain at least one uppercase letter",
              number: (value) =>
                /\d/.test(value) || "Password must contain at least one number",
              specialCharacter: (value) =>
                /[\W_]/.test(value) ||
                "Password must contain at least one special character"
            }
          })}
          id="currentPassword"
          autoComplete="password"
          className="text-sm border rounded text-highlighted-color placeholder:heading-very-light border-border-gray p-3.5 outline-none block w-full pr-8"
          type="password"
          placeholder="*****************"
        />
        {errors.currentPassword && (
          <span className="text-xs text-[#FF1010]">
            {errors.currentPassword.message}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  "Password must contain at least one special character",
                notSameAsCurrent: (value) =>
                  value !== currentPassword ||
                  "New password must not be the same as the current password"
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
      </div>
      <div className="mt-7">
        <button
          disabled={isLoading}
          className="w-full flex gap-2 justify-center items-center bg-green text-white px-4 py-3.5 rounded-md hover:bg-opacity-90 text-sm font-medium"
          type="submit"
        >
          Change Password
        </button>
      </div>
    </form>
  );
};

export default ChangePasswordForm;
