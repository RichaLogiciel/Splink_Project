export const buttonTheme = {
  base: "group relative flex items-stretch justify-center p-0.5 text-center font-medium focus:z-10 focus:outline-none",
  fullSized: "w-full",
  outline: "border",
  disabled: "cursor-not-allowed opacity-50",
  rounded: {
    on: "rounded-full",
    off: "rounded-md"
  },
  color: {
    primary: "text-white bg-primary hover:bg-opacity-90",
    dark: "text-white bg-black hover:bg-opacity-90",
    success: "text-white bg-green hover:bg-opacity-90",
    danger: "text-white bg-danger hover:bg-opacity-90",
    warning: "text-white bg-warning hover:bg-opacity-90"
  },
  outlineColor: {
    primary:
      "text-primary border-primary bg-white hover:bg-primary hover:text-white",
    dark: "text-dark border-dark bg-white hover:bg-dark hover:text-white",
    success: "text-green border-green bg-white hover:bg-green hover:text-white",
    danger:
      "text-danger border-danger bg-white hover:bg-danger hover:text-white",
    warning:
      "text-warning border-warning bg-white hover:bg-warning hover:text-white"
  },
  size: {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  }
};
