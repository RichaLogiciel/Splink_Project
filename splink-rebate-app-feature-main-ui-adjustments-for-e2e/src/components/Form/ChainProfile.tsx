import PhoneInput from "@/components/Form/PhoneInput";
import Button from "@/core-ui/Button";
import { validateEmail } from "@/utils/formHelper";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import infoIcon from "@/assets/icons/info.svg";
import WhiteCrossIcon from "@/assets/icons/WhiteCrossIcon.svg";
import { ChainFormInputs } from "@/core-ui/Input/types";
import { default as Image, default as NextImage } from "next/image";
import PasswordValidationPopOver from "../Dialog/PasswordValidation";

interface ChainProfileProps {
  storesData?: any;
  independentStores?: any;
  defaultEmail?: string;
  showPasswordField?: boolean;
  onSubmit: SubmitHandler<ChainFormInputs>;
  isLoading: boolean;
  user?: any;
  onCancel?: React.MouseEventHandler<HTMLButtonElement>;
  defaultValues?: { id: number; name: string };
}

const ChainProfile: React.FC<ChainProfileProps> = ({
  storesData,
  independentStores,
  defaultEmail = "",
  showPasswordField = false,
  isLoading,
  user,
  onSubmit,
  onCancel = () => {},
  defaultValues
}) => {
  const {
    register,
    control,
    watch,
    trigger,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors }
  } = useForm<ChainFormInputs>({
    mode: "onChange"
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  useEffect(() => {
    if (password && confirmPassword != "") {
      // Trigger validation for confirmPassword whenever password changes
      trigger("confirmPassword");
    }
  }, [password]);

  const [isPopOverOpen, setIsPopOverOpen] = useState(false);
  const [stores, setStores] = useState(storesData);
  const [nonChainStores, setNonChainStores] = useState(independentStores);
  const [showNonChainStores, setShowNonChainStores] = useState(false);
  const togglePopOver = () => setIsPopOverOpen(!isPopOverOpen);

  useEffect(() => {
    setNonChainStores(independentStores);
  }, [independentStores]);
  useEffect(() => {
    setStores(storesData);
  }, [storesData]);

  const FormField = ({
    id,
    label,
    store,
    register,
    errors,
    maxLength = 20
  }: any) => (
    <div className="flex-1">
      <label htmlFor={id} className="block text-xs">
        {label}
        <span className="text-[#FF1010]">*</span>
        <input
          {...register(`stores.${store.id}.${id}`, {
            required: true,
            value: store?.[id == "storeName" ? "name" : id] || ""
          })}
          id={id}
          type="text"
          className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
          maxLength={maxLength}
        />
      </label>
      {errors?.stores?.[store.id]?.[id] && (
        <span className="text-xs text-[#FF1010]">This field is required</span>
      )}
    </div>
  );

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
                  value: user?.firstName || ""
                })}
                id="firstName"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                maxLength={20}
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
                  value: user?.lastName || ""
                })}
                id="lastName"
                type="text"
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                maxLength={20}
              />
            </label>
            {errors.lastName && (
              <span className="text-xs text-[#FF1010]">
                This field is required
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-4 mb-5">
          <div className="flex-1">
            <label htmlFor="email" className="block text-xs">
              Email
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("email", {
                  required: "Email address is required",
                  validate: validateEmail,
                  value: user?.email || ""
                })}
                id="email"
                type="email"
                disabled={defaultEmail ? true : false}
                defaultValue=""
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
                maxLength={50}
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
                defaultValue={user?.phone || ""}
                errors={errors}
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

        <div className="flex space-x-4">
          <div className="flex-1">
            <label htmlFor="chainName" className="block text-xs">
              Chain Name
              <span className="text-[#FF1010]">*</span>
              <input
                {...register("chainName", {
                  required: "Chain name is required",
                  value: defaultValues?.name
                })}
                id="chainName"
                type="chainName"
                disabled={true}
                className="mt-2 text-sm block w-full rounded border border-border-gray px-3 py-2 text-highlighted-color outline-none"
              />
            </label>
            {errors.chainName && (
              <span className="text-xs text-[#FF1010]">
                {errors.chainName.message}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-5">
        <p className="text-base text-highlighted-color font-semibold">
          Stores Details
        </p>
        <Button
          disabled={isLoading}
          type="button"
          onClick={() => {
            setShowNonChainStores((prev) => !prev);
          }}
          color="success"
          size="sm"
          className="disabled:opacity-60 min-w-32"
        >
          {showNonChainStores ? "Hide" : "Show"} Non Chain Store
        </Button>
      </div>

      <div className="store-details-container overflow-y-scroll max-h-[210px]">
        {!showNonChainStores &&
          stores &&
          stores.length > 0 &&
          stores?.map((store: any, index: number) => (
            <div key={index} className="bg-[#F9FAFB] p-5 mb-5 relative">
              <div className="flex space-x-4 mb-5">
                <FormField
                  id="storeName"
                  label="Store Name"
                  store={store}
                  register={register}
                  errors={errors}
                  maxLength={50}
                />
                <FormField
                  id="address"
                  label="Store Address"
                  store={store}
                  register={register}
                  errors={errors}
                  maxLength={50}
                />
              </div>
              <div className="flex space-x-4">
                <FormField
                  id="state"
                  label="State"
                  store={store}
                  register={register}
                  errors={errors}
                />

                <FormField
                  id="city"
                  label="City"
                  store={store}
                  register={register}
                  errors={errors}
                />

                <FormField
                  id="zip"
                  label="Zip"
                  store={store}
                  register={register}
                  errors={errors}
                  maxLength={11}
                />
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
                          uppercase: (value = "") =>
                            /[A-Z]/.test(value) ||
                            "Password must contain at least one uppercase letter",
                          number: (value = "") =>
                            /\d/.test(value) ||
                            "Password must contain at least one number",
                          specialCharacter: (value = "") =>
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
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-xs"
                    >
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

              {stores.length > 1 && (
                <div
                  className="absolute top-2 right-2 p-1 rounded-full cursor-pointer"
                  style={{ backgroundColor: "#BC0909" }}
                  onClick={() => {
                    // Get current form values
                    const currentStores = getValues("stores") || {};
                    // Remove store from form state
                    delete currentStores[store.id];
                    setValue("stores", currentStores);
                    // Update UI state to remove the store block
                    setStores(stores.filter((st: any) => st.id !== store.id));

                    const selectedStore = stores.find(
                      (st: any) => st.id == store.id
                    );
                    setNonChainStores((prev: any) => [selectedStore, ...prev]);
                  }}
                >
                  <Image
                    src={WhiteCrossIcon.src}
                    height={6}
                    width={6}
                    alt="cross Icon"
                  />
                </div>
              )}
            </div>
          ))}
        {showNonChainStores &&
          (nonChainStores?.length ? (
            nonChainStores?.map((store: any, index: number) => (
              <div
                key={index}
                className="flex justify-between items-center bg-[#F9FAFB] p-1 mb-2 relative"
              >
                <div className="flex space-x-4">{store.name}</div>
                <Button
                  type="button"
                  onClick={() => {
                    const isNonChainStore = !storesData?.find(
                      (st: any) => st.id == store.id
                    );
                    // Get current form values
                    const currentStores = getValues("stores") || {};

                    const storeData = {
                      storeName: store.name,
                      ...store,
                      isNew: isNonChainStore
                    };

                    currentStores[store.id] = storeData;

                    setValue("stores", currentStores);
                    setStores([storeData, ...(stores ?? [])]);
                    setNonChainStores((prev: any) =>
                      prev.filter((st: any) => st.id != store.id)
                    );
                  }}
                  color="success"
                  size="sm"
                  className="disabled:opacity-60 min-w-32"
                >
                  Add
                </Button>
              </div>
            ))
          ) : (
            <div className="bg-[#F9FAFB] p-5 mb-5 relative">
              {" "}
              No store to select
            </div>
          ))}
      </div>

      <div className="flex gap-3 justify-end mt-5">
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
          {isLoading ? "Sending Invite" : "Send Invite"}
        </Button>
      </div>
    </form>
  );
};

export default ChainProfile;
