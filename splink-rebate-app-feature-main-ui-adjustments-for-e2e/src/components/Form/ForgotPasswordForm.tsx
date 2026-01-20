"use client";
// Import Core Packages
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import { apiClient } from "@/lib/axiosClient";
import { validateEmail } from "@/utils/formHelper";

// Import Types & Interfaces
type Inputs = {
  email: string;
};

const ForgotPasswordForm = () => {
  const searchParams = useSearchParams();
  const queryError = (searchParams?.get("err") || "") as string;

  const [formMessage, setFormMessage] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeoutState, setTimeoutState] = useState<any>();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    clearInterval(timeoutState);
    setIsLoading(true);
    const timeoutTime = 10000;

    try {
      // Sample validation to be replace with actual login logic
      await apiClient.post("/auth/forget-password", {
        email: data.email
      });

      if (data.email == "example@example.com") {
        setEmailSent(false);
        setFormMessage(
          "Email or password is incorrect. Please try another email address."
        );
        setTimeoutState(setTimeout(() => setFormMessage(""), timeoutTime));
      } else {
        setEmailSent(true);
        setFormMessage(
          "Email sent to provided email address. Check your email for reset instructions."
        );
      }
    } catch (error: any) {
      setEmailSent(false);
      setFormMessage(error?.data || "Faced some issue while sending email.");
      setTimeoutState(setTimeout(() => setFormMessage(""), timeoutTime));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (queryError == "IPRT") {
      setFormMessage(
        "The provided password reset link was invalid. Please try resetting your password again."
      );
      setTimeoutState(setTimeout(() => setFormMessage(""), 5000));
    }
  }, [queryError]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      method="post"
      className={isLoading ? "opacity-60" : ""}
    >
      {!emailSent && (
        <div className="mb-2">
          <label className="mb-2 block text-xs" htmlFor="email">
            Email
          </label>
          <input
            {...register("email", {
              required: "Email address is required",
              validate: validateEmail
            })}
            id="email"
            autoComplete="email"
            className="text-sm border rounded text-highlighted-color placeholder:heading-very-light border-border-gray p-3.5 outline-none block w-full"
            type="text"
            placeholder="john.doe@example.com"
          />
          {errors.email && (
            <span className="text-xs text-[#FF1010]">
              {errors.email.message}
            </span>
          )}
        </div>
      )}
      {formMessage && (
        <p
          className={` font-medium ${
            emailSent
              ? "text-green text-md text-center"
              : "text-[#FF1010] text-xs"
          }`}
        >
          {formMessage}
        </p>
      )}
      {!emailSent && (
        <div className="mt-7">
          <button
            disabled={isLoading}
            className="w-full flex gap-2 justify-center items-center bg-green text-white px-4 py-3.5 rounded-md hover:bg-opacity-90 text-sm font-medium"
            type="submit"
          >
            Submit
          </button>
        </div>
      )}
    </form>
  );
};

export default ForgotPasswordForm;
