export const textAreaTheme = {
  base: "border rounded px-4 w-full focus:outline-none resize-none text-sm",
  label: "block text-black text-sm font-bold mb-1.5",
  colors: {
    default:
      "border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/60",
    error: "border-error focus:border-error focus:ring-2 focus:ring-error/40"
  },
  disabled: {
    on: "cursor-not-allowed opacity-80 bg-gray-100",
    off: "cursor-text"
  },
  errorMessage: "text-error text-xs mt-1",
  helperText: "text-black text-xs mt-1"
};
