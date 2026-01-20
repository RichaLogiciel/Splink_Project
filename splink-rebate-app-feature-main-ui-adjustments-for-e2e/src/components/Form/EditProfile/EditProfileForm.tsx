"use client";

// Default/Core Imports
import { getUserClient, updateUserCookieClient } from "@/utils/getUserClient";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

// Import Components
import PhoneInput from "../PhoneInput";

// Import Types
import { apiClient } from "@/lib/axiosClient";
import { EditProfilePropType } from "@/types/AccountTypes";

type Inputs = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  additionalPhoneNumber: string;
};

const EditProfile: React.FC<EditProfilePropType> = ({ userInfo }) => {
  const [additionalPhone, setAdditionalPhone] = useState(
    userInfo?.secondaryPhone ? true : false
  );
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const user = getUserClient();

  const {
    register,
    control,
    watch,
    trigger,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const phoneNumber = watch("phoneNumber");

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);

    const formData = {
      userID: user?.id, // Assuming userID is always 1 for this example
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phoneNumber,
      secondaryPhone: data.additionalPhoneNumber
    };

    try {
      await apiClient.put("/user/update-profile-details", formData);

      updateUserCookieClient({
        firstName: formData.firstName,
        lastName: formData.lastName
      });
      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error: any) {
      if (isAxiosError(error)) {
        const message =
          error.response?.data?.message || "Failed to update profile.";
        toast.error("Error: " + message);
      } else {
        toast.error(error?.data || "An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg bg-white p-7 sm:p-14 shadow-xl">
        <div className="max-w-[720px] mx-auto">
          <h2 className="mb-1 text-2xl font-semibold text-[#333]">
            Edit Profile
          </h2>
          <p className="text-sm">Edit your name, avatar etc.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-10">
            <div className="flex space-x-4 mb-5">
              <div className="flex-1">
                <label htmlFor="firstName" className="mb-2 block text-xs">
                  First Name<span className="text-[#FF1010]">*</span>
                </label>
                <input
                  {...register("firstName", { required: true })}
                  id="firstName"
                  type="text"
                  className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                  defaultValue={userInfo.firstName}
                />
                {errors.firstName && (
                  <span className="text-xs text-[#FF1010]">
                    This field is required
                  </span>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="lastName" className="mb-2 block text-xs">
                  Last Name<span className="text-[#FF1010]">*</span>
                </label>
                <input
                  {...register("lastName", { required: true })}
                  id="lastName"
                  type="text"
                  className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                  defaultValue={userInfo.lastName}
                />
                {errors.lastName && (
                  <span className="text-xs text-[#FF1010]">
                    This field is required
                  </span>
                )}
              </div>
            </div>
            <div className="mb-5">
              <label htmlFor="email" className="mb-2 block text-xs">
                Email<span className="text-[#FF1010]">*</span>
              </label>
              <input
                id="email"
                type="email"
                disabled
                className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                defaultValue={userInfo?.email}
              />
            </div>
            <div className="mb-2">
              <label htmlFor="phoneNumber" className="mb-2 block text-xs">
                Phone Number<span className="text-[#FF1010]">*</span>
              </label>
              <PhoneInput
                name="phoneNumber"
                errors={errors}
                trigger={trigger}
                control={control}
                setValue={setValue}
                className="w-full rounded border border-border-gray px-3 py-2 text-sm text-highlighted-color outline-none"
                rules={{
                  required: "This field is required",
                  pattern: {
                    value: /^\(\d{3}\) \d{3}-\d{4}$/,
                    message: "Phone number must be in the format (xxx) xxx-xxxx"
                  }
                }}
                defaultValue={userInfo?.phone}
              />
            </div>
            {additionalPhone && (
              <div>
                <label htmlFor="additionalPhone" className="mb-2 block text-xs">
                  Additional Phone
                </label>
                <PhoneInput
                  name="additionalPhoneNumber"
                  errors={errors}
                  trigger={trigger}
                  control={control}
                  setValue={setValue}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none"
                  rules={{
                    validate: (value) =>
                      value !== phoneNumber ||
                      "Additional Phone should not match with Phone number.",
                    pattern: {
                      value: /^\(\d{3}\) \d{3}-\d{4}$/,
                      message:
                        "Phone number must be in the format (xxx) xxx-xxxx"
                    }
                  }}
                  defaultValue={userInfo?.secondaryPhone}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setAdditionalPhone(!additionalPhone)}
              className="text-xs text-green font-medium"
            >
              {additionalPhone
                ? "- Remove Additional Phone"
                : "+ Additional Phone"}
            </button>

            <div className="mt-12">
              <button
                disabled={isLoading}
                type="submit"
                className="rounded disabled:opacity-60 bg-green px-4 py-2 text-white text-sm font-medium block w-full"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditProfile;
