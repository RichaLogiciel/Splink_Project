export const validateEmail = (value: string) => {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  if (!emailRegex.test(value)) {
    return "Email address is not valid";
  }

  return true;
};

export const handleZipValidation = (e: any) => {
  const value = e.currentTarget.value;
  if (!/^\d*-?\d*$/.test(value) || value.length > 5) {
    e.currentTarget.value = value.slice(0, -1);
  }
};

export const handleGoToValidation = (e: any) => {
  const value = e.currentTarget.value;
  if (!/(^\d)/.test(value)) {
    e.currentTarget.value = value.slice(0, -1);
  }
};
