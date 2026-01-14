export const formatNumber = (
  num: number,
  round = true,
  minimumFractionDigits?: number
): string => {
  const integerValue = round ? Math.round(num) : num;

  // Return the formatted integer value as a string
  return integerValue
    ? integerValue.toLocaleString("en-US", {
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: 1
      })
    : "0";
};

export const removeSpecialCharacters = (str: string): string => {
  return str.replace(/[^a-zA-Z0-9]/g, "");
};
