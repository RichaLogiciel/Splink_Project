"use client";

// Default/Core Imports
import { getUserClient, updateUserCookieClient } from "@/utils/getUserClient";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";

// Import Components
import PhoneInput from "../PhoneInput";

// Import Types
import { SUPPORTED_IMAGES } from "@/configs/images";
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { EditProfilePropType } from "@/types/AccountTypes";
import { handleZipValidation } from "@/utils/formHelper";
import { getMegaByteToByte } from "@/utils/helper";

const MAX_LOGO_SIZE = 2; // MB

type Inputs = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  additionalPhoneNumber: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  confirmPassword: string;
  manufacturerName?: string;
  storeName?: string;
  logo: { url: string; file: File } | null;
};

const EditManufacturerProfile: React.FC<EditProfilePropType> = ({
  userInfo
}) => {
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
    reset,
    formState: { errors }
  } = useForm<Inputs>({
    mode: "onChange"
  });

  const phoneNumber = watch("phoneNumber");
  const logo = watch("logo");

  useEffect(() => {
    if (userInfo) {
      reset({
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        phoneNumber: userInfo.phone,
        additionalPhoneNumber: userInfo.secondaryPhone,
        address: userInfo.address,
        city: userInfo.city,
        state: userInfo.state,
        zip: userInfo.zip,
        manufacturerName: userInfo.manufacturerName,
        logo: { url: userInfo.logo },
        storeName: userInfo.storeName || ""
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await apiClient.post("/upload-file", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      return (data?.fileUrl || "") as string;
    } catch (error: any) {
      return "";
    }
  };

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);

    let logoUrl: string = data?.logo?.url || "";

    if (data?.logo && data?.logo?.url?.startsWith("data")) {
      logoUrl = await uploadFile(data.logo.file);

      if (!logoUrl) {
        toast.error("Failed to upload logo. Please try again.");
        setIsLoading(false);
        return;
      }
    }

    const formData = {
      userID: user?.id,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      phone: data.phoneNumber,
      secondaryPhone: data.additionalPhoneNumber,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      ...(data?.logo && { logo: logoUrl }),
      ...(data?.storeName && { storeName: data.storeName }),
      ...(data?.manufacturerName && { manufacturerName: data.manufacturerName })
    };

    try {
      await apiClient.put("/user/update-profile-details", formData);

      updateUserCookieClient({
        firstName: formData.firstName,
        lastName: formData.lastName,
        logo: logoUrl,
        ...(data?.manufacturerName && { orgName: data.manufacturerName })
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
            <div className="flex space-x-4 mb-5">
              <div className="flex-1">
                <label
                  htmlFor="manufacturerName"
                  className="mb-2 block text-xs"
                >
                  Manufacturer Name
                  <span className="text-[#FF1010]">*</span>
                </label>
                <input
                  {...register("manufacturerName", { required: true })}
                  id="manufacturerName"
                  type="text"
                  className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                  defaultValue={userInfo.distributorName ?? ""}
                  disabled={
                    user?.role == USER_ROLES.MANUFACTURER_SALES_REP ||
                    user?.role == USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER ||
                    user?.role == USER_ROLES.MANUFACTURER_EXECUTIVE
                  }
                />
                {errors.manufacturerName && (
                  <span className="text-xs text-[#FF1010]">
                    This field is required
                  </span>
                )}
              </div>
            </div>
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
                  defaultValue={userInfo.address ?? ""}
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
                  defaultValue={userInfo.city ?? ""}
                />
                {errors.city && (
                  <span className="text-xs text-[#FF1010]">
                    This field is required
                  </span>
                )}
              </div>
            </div>
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
                  defaultValue={userInfo.state ?? ""}
                />
                {errors.state && (
                  <span className="text-xs text-[#FF1010]">
                    This field is required
                  </span>
                )}
              </div>
              <div className="flex-1">
                <label htmlFor="lastName" className="mb-2 block text-xs">
                  Zip<span className="text-[#FF1010]">*</span>
                </label>
                <input
                  {...register("zip", {
                    required:
                      "ZIP code must be up to 5 digits and contain only numbers", // Ensures the field is not empty
                    pattern: {
                      value: /(^\d{5}$)|(^\d{5}-\d{4}$)/,
                      message: "Please enter a valid Zip"
                    }
                  })}
                  id="zip"
                  type="text"
                  className="text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                  defaultValue={userInfo.zip}
                  onInput={handleZipValidation}
                />
                {errors.zip && (
                  <span className="text-xs text-[#FF1010]">
                    {errors.zip.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex space-x-4 mb-5">
              <div className="flex-1">
                <label htmlFor="lastName" className="mb-2 block text-xs">
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

              <div className="flex-1">
                <label htmlFor="lastName" className="mb-2 block text-xs">
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
                      message:
                        "Phone number must be in the format (xxx) xxx-xxxx"
                    }
                  }}
                  defaultValue={userInfo?.phone}
                />
                {errors.lastName && (
                  <span className="text-xs text-[#FF1010]">
                    This field is required
                  </span>
                )}
              </div>
            </div>

            <div className="flex space-x-4 ">
              {additionalPhone && (
                <div className="flex-1">
                  <label
                    htmlFor="additionalPhone"
                    className="mb-2 block text-xs"
                  >
                    Additional Phone<span className="text-[#FF1010]">*</span>
                  </label>

                  <PhoneInput
                    name="additionalPhoneNumber"
                    errors={errors}
                    trigger={trigger}
                    control={control}
                    setValue={setValue}
                    className="w-full rounded border border-border-gray px-3 py-2 text-sm text-highlighted-color outline-none"
                    rules={{
                      required: "This field is required",
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
            </div>

            <div className="flex space-x-4 mb-1"></div>
            <button
              type="button"
              onClick={() => {
                setValue("additionalPhoneNumber", "");
                setAdditionalPhone(!additionalPhone);
              }}
              className="text-xs text-green font-medium"
            >
              {additionalPhone
                ? "- Remove Additional Phone"
                : "+ Additional Phone"}
            </button>

            <div className="flex space-x-4 mb-5"></div>
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
                      Supported Formats: png, jpg & jpeg. Max allowed file size:
                      2MB
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

export default EditManufacturerProfile;
