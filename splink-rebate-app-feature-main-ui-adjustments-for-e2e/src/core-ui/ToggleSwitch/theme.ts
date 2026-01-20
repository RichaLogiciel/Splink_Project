export const toggleSwitchTheme = {
  container: "flex items-center space-x-2",
  base: "rounded-full relative transition-all duration-300",
  label: "text-black",
  labelSize: {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  },
  checked: {
    on: "bg-green",
    off: "bg-gray-300"
  },
  disabled: {
    on: "cursor-not-allowed opacity-60",
    off: "cursor-pointer"
  },
  size: {
    sm: "w-10 h-5",
    md: "w-12 h-6",
    lg: "w-16 h-8"
  },
  switchHandle: {
    base: "absolute left-0 bg-white rounded-full shadow-md transform transition-transform duration-300",
    on: "translate-x-full",
    off: "",
    size: {
      sm: "w-5 h-5",
      md: "w-6 h-6",
      lg: "w-8 h-8"
    }
  },
  toggleSwitchInput: "opacity-0 z-10 relative w-full h-full"
};
