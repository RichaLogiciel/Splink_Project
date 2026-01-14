import pluginJs from "@eslint/js";
import { defineConfig } from "eslint-define-config";
import globals from "globals";
import tsLint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["src/__tests__/templates/**"]
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        process: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly"
      },
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module" // Set this to "module" for ES modules
      }
    },
    plugins: {
      typescript: tsLint
    }
  },
  pluginJs.configs.recommended,
  ...tsLint.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { allow: ["error", "info"] }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-require-imports": "off", // Allow require() usage
      "@typescript-eslint/no-explicit-any": "off"
      // Other rules as needed
    }
  },
  {
    // Lambda files - allow console statements and Node.js globals
    files: ["lambdas/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "writable",
        module: "readonly",
        require: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "no-console": "off", // Console is expected in Lambda functions
      "no-undef": "off" // Node.js globals are available
    }
  }
]);
