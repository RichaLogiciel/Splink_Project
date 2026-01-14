import { TextareaHTMLAttributes } from "react";

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}
