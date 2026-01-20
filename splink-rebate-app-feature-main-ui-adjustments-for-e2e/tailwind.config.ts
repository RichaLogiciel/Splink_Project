import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      screens: {
        "1xl": "1366px"
      },
      boxShadow: {
        "bottom-drop-shadow": "0px 0px 8px rgba(29, 29, 31, 0.1)",
        "right-drop-shadow": "0px 0 8px rgba(29, 29, 31, 0.1)",
        "popout-shadow": "0px 2px 10px 2px rgba(0, 0, 0, 0.1)",
        "setup-profile-card": "0px 4px 24px 0px rgba(0, 0, 0, 0.11)",
        "header-user-dropdown": "0px 0px 9px 0px rgba(0, 0, 0, 0.12)"
      },
      colors: {
        "highlighted-color": "#1D1D1F",
        "border-gray": "#E6E6E7",
        "theme-light-gray": "#E6E6E7",
        "common-bg": "#F5F5F6",
        "blue-bg": "#E6F1F8",
        "profit-bg": "#18B3681A",
        "orange-bg": "#FF99001A",
        profit: "#18B368",
        "bell-icon-color": "#E53935",
        "horizontal-bar": "#DFE3E8",
        green: "#106210",
        danger: "#dc2626",
        "light-green": "#A5D6A5",
        orange: "#FF9900",
        "heading-very-light": "#84858C",
        "heading-light": "#696A71",
        "heading-blue": "#0071B3",
        "filter-light": "#4C4D52",
        "small-bar-values": "#454F5B",
        "info-0": "#CCE3F0"
      },
      spacing: {
        "12px": "12px",
        "22px": "22px"
      },
      fontSize: {
        "size-20": "1.25rem"
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"]
      },
      textUnderlineOffset: {
        6: "6px"
      }
    }
  },
  variants: {
    placeholderColor: ["focus", "hover"]
  },
  plugins: [
    plugin(({ matchUtilities }) => {
      matchUtilities(
        {
          "grid-col": (value) => ({
            "grid-template-columns": `repeat(auto-fill, minmax(${value}, 1fr))`
          }),
          "grid-col-fit": (value) => ({
            "grid-template-columns": `repeat(auto-fit, minmax(${value}, 1fr))`
          })
        }
        // { values: {}, supportsNegativeValues: false } // Allows arbitrary values
      );
    })
  ]
};
export default config;
