import { ERROR_MESSAGES } from "../config/errorMessages";

export const getFullName = (fName: string | null, lname: string | null) => {
  return `${fName || ""} ${lname || ""}`.trim();
};

export const validatePassword = (password: string): string | boolean => {
  if (!password) {
    return ERROR_MESSAGES.AUTH.PASSWORD.REQUIRED;
  }

  if (password.length < 8) {
    return ERROR_MESSAGES.AUTH.PASSWORD.LENGTH;
  }

  if (!/[A-Z]/.test(password)) {
    return ERROR_MESSAGES.AUTH.PASSWORD.UPPERCASE;
  }

  if (!/\d/.test(password)) {
    return ERROR_MESSAGES.AUTH.PASSWORD.NUMBER;
  }

  if (!/[\W_]/.test(password)) {
    return ERROR_MESSAGES.AUTH.PASSWORD.SPECIAL_CHAR;
  }

  return true;
};
