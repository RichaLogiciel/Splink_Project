import { InputHTMLAttributes } from "react";

export type Sizes = "sm" | "md" | "lg";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  inputSize?: Sizes;
  disabled?: boolean;
  className?: string;
  pageVariable?: string;
  [props: string]: any;
}

export interface ChainFormInputs {
  email: string;
  chainName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  storeName: string;
  password?: string;
  confirmPassword?: string;
  stores: {
    [storeId: string]: {
      storeName: string;
      address: string;
      state: string;
      city: string;
      zip: string;
      isNew?: boolean;
    };
  };
}
