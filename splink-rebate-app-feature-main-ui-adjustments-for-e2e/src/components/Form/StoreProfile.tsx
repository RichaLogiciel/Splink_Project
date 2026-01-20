import PhoneInput from "@/components/Form/PhoneInput";
import Button from "@/core-ui/Button";
import { StoreProfileDetails } from "@/types/StoreTypes";
import { handleZipValidation, validateEmail } from "@/utils/formHelper";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import infoIcon from "@/assets/icons/info.svg";
import PasswordValidationPopOver from "@/components/Dialog/PasswordValidation";
import NextImage from "next/image";

interface Inputs {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  storeName: string;
  password: string;
  confirmPassword: string;
}

interface StoreProfileProps {
  submitLabel?: string;
  showPasswordField?: boolean;
  defaultEmail?: string;
  onSubmit: SubmitHandler<Inputs>;
  isLoading: boolean;
  popupStyle?: boolean;
  onCancel?: React.MouseEventHandler<HTMLButtonElement>;
  defaultValues: StoreProfileDetails | null;
}

const StoreProfile: React.FC<StoreProfileProps> = ({
  submitLabel = "",
  showPasswordField = false,
  defaultEmail = "",
  isLoading,
  onSubmit,
  popupStyle,
  onCancel = () => {},
  defaultValues
}) => {
  const {
    register,
    control,
    watch,
    trigger,
    setValue,
    handleSubmit,
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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={isLoading ? "pointer-events-none opacity-60" : ""}
    >
      <div className="mb-8">
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label htmlFor="firstName" className="block text-xs">
              Contact First Name
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("firstName", {
                  required: true,
                  value: defaultValues?.firstName || ""
                })}
                id="firstName"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.firstName && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="lastName" className="block text-xs">
              Contact Last Name
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("lastName", {
                  required: true,
                  value: defaultValues?.lastName || ""
                })}
                id="lastName"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.lastName && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="email" className="block text-xs">
              Email
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("email", {
                  required: "Email address is required",
                  validate: validateEmail,
                  value: defaultEmail || defaultValues?.email || ""
                })}
                id="email"
                type="email"
                disabled={defaultEmail ? true : false}
                defaultValue={defaultEmail || defaultValues?.email || ""}
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.email && (
              <span className="text-xs text-[#FF1010]">
                {errors.email.message}
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="phoneNumber" className="block text-xs">
              Phone Number<span className="text-[#FF1010]">*</span>
              <PhoneInput
                name="phoneNumber"
                defaultValue={defaultValues?.phone || ""}
                errors={errors}
                trigger={trigger}
                control={control}
                setValue={setValue}
                className="w-full mt-2 rounded border border-border-gray px-3 py-2 text-sm text-highlighted-color outline-none"
                rules={{
                  required: "This field is required",
                  pattern: {
                    value: /^\(\d{3}\) \d{3}-\d{4}$/,
                    message: "Phone number must be in the format (xxx) xxx-xxxx"
                  }
                }}
              />
            </label>
          </div>
        </div>

        {showPasswordField && (
          <div className="flex space-x-4 mt-5">
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
        )}
      </div>

      <p className="text-base text-highlighted-color mb-5 font-semibold">
        Add Store Details
      </p>

      <div className="bg-[#F9FAFB] p-5">
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label htmlFor="storeName" className="block text-xs">
              Store Name
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("storeName", {
                  required: true,
                  value: defaultValues?.storeName || ""
                })}
                id="storeName"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.storeName && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="address" className="block text-xs">
              Store Address
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("address", {
                  required: true,
                  value: defaultValues?.address || ""
                })}
                id="address"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.address && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="state" className="block text-xs">
              State
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("state", {
                  required: true,
                  value: defaultValues?.state || ""
                })}
                id="state"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.state && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="city" className="block text-xs">
              City
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("city", {
                  required: true,
                  value: defaultValues?.city || ""
                })}
                id="city"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.city && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="zip" className="block text-xs">
              Zip
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("zip", {
                  value: defaultValues?.zip || "",
                  required: "This field is required",
                  pattern: {
                    value: /(^\d{5}$)|(^\d{5}-\d{4}$)/,
                    message: "Please enter a valid Zip"
                  }
                })}
                id="zip"
                type="text"
                onInput={handleZipValidation}
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.zip && (
              <span className="text-xs text-[#FF1010]">
                {errors.zip.message}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className={`flex gap-3 ${popupStyle ? "justify-end mt-5" : "mt-10 justify-center"}`}
      >
        <Button
          disabled={isLoading}
          type="reset"
          onClick={onCancel}
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
          {submitLabel || "Save"}
        </Button>
      </div>
    </form>
  );
};

export default StoreProfile;
