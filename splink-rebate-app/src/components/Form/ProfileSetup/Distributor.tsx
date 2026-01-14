"use client";

// Default/Core Imports
import { apiClient } from "@/lib/axiosClient";
import { handleZipValidation } from "@/utils/formHelper";
import { isDistributorAdmin } from "@/utils/rolesConditions";
import React, { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

// Import Components
import PhoneInput from "@/components/Form/PhoneInput";
import Button from "@/core-ui/Button";
import { getMegaByteToByte } from "@/utils/helper";

import infoIcon from "@/assets/icons/info.svg";
import PasswordValidationPopOver from "@/components/Dialog/PasswordValidation";
import { SUPPORTED_IMAGES } from "@/configs/images";
import { identifyUser, initMixpanel } from "@/lib/mixpanelClient";
import { handleAuthSuccess } from "@/utils/auth";
import NextImage from "next/image";

const MAX_LOGO_SIZE = 2; // MB

interface Inputs {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  logo: { url: string; file: File | null } | null;
  password: string;
  confirmPassword: string;
  title?: string;
  distributorName?: string;
}

interface EditProfileProps {
  token: string;
  email: string;
  role: string;
}

const ProfileSetup: React.FC<EditProfileProps> = ({
  token,
  email: defaultEmail,
  role
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    control,
    watch,
    trigger,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const password = watch("password");
  const logo = watch("logo");
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

  /**
   * Validate Image Type
   *
   * @param {String} type [Mime Type]
   *
   * @return {Boolean}
   */
  const validateImageType = (type: string) => {
    if (SUPPORTED_IMAGES.includes(type)) return true;

    return false;
  };

  /**
   * Validate Image Size
   *
   * @param {Number} size
   *
   * @return {Boolean}
   */
  const validateImageSize = (size: number) => {
    if (size > getMegaByteToByte(MAX_LOGO_SIZE)) {
      return false;
    }

    return true;
  };

  const onChangeLogo = (evt: any) => {
    const [file] = evt.target.files;

    if (!file) return;

    if (!validateImageType(file.type)) return;
    if (!validateImageSize(file.size)) return;

    const reader = new FileReader();

    reader.onload = () => {
      const image: any = new Image();
      image.src = reader.result;

      image.onload = () => {
        setTimeout(() => {
          const selectedLogo = {
            url: reader.result as string,
            file
          };
          setValue("logo", selectedLogo);
        }, 200);
      };
    };

    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/upload-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return response?.data?.fileUrl ?? "";
    } catch {
      return "";
    }
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);

    let logoUrl: string = data?.logo?.url || "";

    if (data?.logo && data?.logo?.url?.startsWith("data") && data.logo.file) {
      logoUrl = await uploadFile(data.logo.file);

      if (!logoUrl) {
        toast.error("Failed to upload logo. Please try again.");
        setIsLoading(false);
        return;
      }

      setValue("logo", { url: logoUrl, file: null });
    }

    try {
      // Replicate API call time
      const params = {
        token,
        email: defaultEmail,
        firstName: data.firstName,
        lastName: data.lastName,
        phones: [data.phoneNumber],
        password: data.password,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        orgName: data?.distributorName || undefined,
        logo: logoUrl || undefined
      };

      // Send API Req
      const response: any = await apiClient.post("/auth/signup", params);
      reset();
      toast.success(
        "Profile created successfully! You can now log in using your new account credentials."
      );

      // Use the common auth success function
      handleAuthSuccess(response, false, initMixpanel, identifyUser, location);
    } catch (error) {
      const err = error as { status: string; data: string };
      toast.error(
        err?.data || "Failed to create your account. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={isLoading ? "pointer-events-none opacity-60" : ""}
    >
      <div className="flex space-x-4 mb-5">
        <div className="flex-1">
          <label htmlFor="firstName" className="mb-2 block text-xs">
            Contact First Name<span className="text-[#FF1010]">*</span>
          </label>
          <input
            {...register("firstName", { required: true })}
            id="firstName"
            type="text"
            className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
          />
          {errors.firstName && (
            <span className="text-xs text-[#FF1010]">
              This field is required
            </span>
          )}
        </div>
        <div className="flex-1">
          <label htmlFor="lastName" className="mb-2 block text-xs">
            Contact Last Name<span className="text-[#FF1010]">*</span>
          </label>
          <input
            {...register("lastName", { required: true })}
            id="lastName"
            type="text"
            className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
          />
          {errors.lastName && (
            <span className="text-xs text-[#FF1010]">
              This field is required
            </span>
          )}
        </div>
      </div>

      {isDistributorAdmin(role) && (
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label htmlFor="distributorName" className="mb-2 block text-xs">
              Distributor Name<span className="text-[#FF1010]">*</span>
            </label>
            <input
              {...register("distributorName", { required: true })}
              id="distributorName"
              type="text"
              className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            />
            {errors?.distributorName && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
        </div>
      )}

      {isDistributorAdmin(role) && (
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label htmlFor="address" className="mb-2 block text-xs">
              Address<span className="text-[#FF1010]">*</span>
            </label>
            <input
              {...register("address", { required: true })}
              id="address"
              type="text"
              className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            />
            {errors.address && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="city" className="mb-2 block text-xs">
              City<span className="text-[#FF1010]">*</span>
            </label>
            <input
              {...register("city", { required: true })}
              id="city"
              type="text"
              className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            />
            {errors.city && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
        </div>
      )}

      {isDistributorAdmin(role) && (
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label htmlFor="state" className="mb-2 block text-xs">
              State<span className="text-[#FF1010]">*</span>
            </label>
            <input
              {...register("state", { required: true })}
              id="state"
              type="text"
              className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            />
            {errors.state && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="zip" className="mb-2 block text-xs">
              Zip<span className="text-[#FF1010]">*</span>
            </label>
            <input
              {...register("zip", {
                required: "This field is required",
                pattern: {
                  value: /(^\d{5}$)|(^\d{5}-\d{4}$)/,
                  message: "Please enter a valid Zip"
                }
              })}
              id="zip"
              type="text"
              className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              onInput={handleZipValidation}
            />
            {errors.zip && (
              <span className="text-xs text-[#FF1010]">
                {errors.zip.message}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex space-x-4 mb-5">
        <div className="flex-1">
          <label htmlFor="email" className="mb-2 block text-xs">
            Email<span className="text-[#FF1010]">*</span>
          </label>
          <input
            id="email"
            type="email"
            disabled
            className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            defaultValue={defaultEmail}
          />
        </div>
        <div className="flex-1">
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
          />
        </div>
      </div>

      <div className="flex space-x-4 mb-5">
        <div className="flex-1 relative">
          <label htmlFor="password" className="mb-2 block text-xs">
            Password<span className="text-[#FF1010]">*</span>
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
            className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            type="password"
          />
          <NextImage
            className="absolute top-9 right-2 cursor-pointer"
            src={infoIcon.src}
            alt="infoIcon"
            width={12}
            height={12}
            onMouseOver={togglePopOver}
            onMouseLeave={togglePopOver}
          />
          {isPopOverOpen && (
            <PasswordValidationPopOver className="-top-20 left-0" />
          )}
          {errors.password && (
            <span className="text-xs text-[#FF1010]">
              {errors.password.message}
            </span>
          )}
        </div>
        <div className="flex-1">
          <label htmlFor="confirmPassword" className="mb-2 block text-xs">
            Confirm Password<span className="text-[#FF1010]">*</span>
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
            className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
            type="password"
          />
          {errors.confirmPassword && (
            <span className="text-xs text-[#FF1010]">
              {errors.confirmPassword.message}
            </span>
          )}
        </div>
      </div>

      {isDistributorAdmin(role) && (
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label className="mb-2 block text-xs">
              Logo
              {/* <span className="text-[#FF1010] none">*</span> */}
              {logo && logo.url && (
                <span
                  className="text-xs text-gray-500 mt-1 cursor-pointer hover:underline ml-2"
                  onClick={() => setValue("logo", null)}
                >
                  (Remove)
                </span>
              )}
            </label>
            {logo && logo.url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.url}
                  alt=""
                  className="border rounded p-1"
                  style={{
                    maxHeight: "80px",
                    maxWidth: "240px"
                  }}
                />
              </>
            ) : (
              <>
                <div className="relative flex items-center justify-center w-full h-16 border-2 border-dashed rounded">
                  <div className="text-primary text-xs text-gray-800">
                    Drag & Drop file here or{" "}
                    <span className="underline">Choose File</span>
                  </div>
                  <input
                    {...register("logo", { required: false })}
                    onChange={onChangeLogo}
                    id="logo"
                    type="file"
                    accept="image/png, image/jpeg"
                    className="absolute w-full h-full z-10 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Supported Formats: png, jpg & jpeg. Max allowed file size: 2MB
                </div>
              </>
            )}

            {errors.logo && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-center gap-3">
        <Button
          disabled={isLoading}
          type="reset"
          color="dark"
          size="sm"
          className="disabled:opacity-60 min-w-32"
        >
          Cancel
        </Button>
        <Button
          disabled={isLoading}
          type="submit"
          color="success"
          size="sm"
          className="disabled:opacity-60 min-w-32"
        >
          Save
        </Button>
      </div>
    </form>
  );
};

export default ProfileSetup;
