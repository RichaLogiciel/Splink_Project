export const ERROR_MESSAGES = {
  REQUIRED: {
    DISTRIBUTOR_ID: "Distributor ID is required.",
    WAREHOUSE_ID: "Warehouse ID is required.",
    MANUFACTURER_ID: "Manufacturer ID is required.",
    MANUFACTURER_ACCOUNT_MANAGER_ID:
      "Manufacturer Account Manager ID is required.",
    DISTRIBUTOR_GENERAL_MANAGER_ID:
      "Distributor General Manager ID is required.",
    SALESREP_ID: "Sales Rep ID is required.",
    STORE_ID: "Store ID is required.",
    USER_ID: "User ID is required.",
    PROGRAM_ID: "Program ID is required.",
    PROGRAM_DETAIL_ID: "Program Detail ID is required.",
    ORDER_ID: "Order ID is required."
  },
  ENTITY: {
    NOT_FOUND: (entityType: string, id: number) =>
      `${entityType} with ID ${id} not found.`
  },
  DISTRIBUTOR: {
    NO_SAVINGS_FOUND: (id: number) =>
      `No savings found for distributor ID ${id}`,
    NOT_FOUND: (id: number) => `Distributor with ID ${id} not found.`
  },
  SALESREP_ID: {
    NO_SAVINGS_FOUND: (id: number) => `No savings found for SalesRep ID ${id}`,
    NOT_FOUND: (id: number) => `SalesRep with ID ${id} not found.`
  },
  AUTH: {
    UNAUTHORIZED: "Unauthorized access.",
    INVALID_TOKEN: "Invalid or expired token provided.",
    AUTHENTICATION_FAILED:
      "Login unsuccessful. Please verify your email and password and try again, or reset your password if you've forgotten it.",
    EMAIL_PASSWORD_REQUIRED: "Email and password are required.",
    REFRESH_TOKEN_REQUIRED: "Refresh token is required.",
    INVALID_PASSWORD: "Invalid password.",
    INVALID_EMAIL: "The email entered is invalid.",
    USER_ROLE_NOT_FOUND: "User role not found.",
    INVALID_REFRESH_TOKEN: "Invalid Refresh Token.",
    USER_ID_REQUIRED: "User ID is required.",
    NO_AUTH_PROVIDED: "No authorization header provided.",
    TOKEN_PASSWORD_REQUIRED: "The provided password or token is incorrect.",
    REPLACE_EMAIL: "New and old emails are required.",
    REPLACE_EMAIL_UPDATE: "Unable to replace email. Contact support if needed.",
    PASSWORD: {
      REQUIRED: "Password is required.",
      LENGTH: "Password must be at least 8 characters.",
      UPPERCASE: "Password must contain at least one uppercase letter.",
      NUMBER: "Password must contain at least one number.",
      SPECIAL_CHAR: "Password must contain at least one special character.",
      DUPLICATE_PASS: "Current and new password cannot be the same.",
      CONFIRM_PASS_NOT_MATCH: "Confirm password should match the password.",
      INVALID_CURRENT_PASS: "Current password is incorrect."
    },
    PASSWORD_UPDATE: "Unable to set new password. Contact support if needed."
  },
  COMMON: {
    INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
    DB_ERROR: "Sequelize instance is not available",
    BAD_REQUEST: "Bad request. Please check your input.",
    REQUEST_TIMEOUT: "Request timeout. Please try again later."
  },
  USER_ROLES: {
    NO_SAVINGS_FOUND: (id: number) => `No savings found for user role ID ${id}`,
    NOT_FOUND: (id: number) => `User Role with ID ${id} not found.`
  },
  USER: {
    INVALID_USER_ID: "Invalid User ID found.",
    NOT_FOUND: "No matching user in our records."
  },
  USERID_REQUIRED: "UserId is required.",
  INVALID_USERID_FORMAT: "Invalid UserId format. Must be a number.",
  NO_PROGRAMS_FOUND: "No programs found for this User.",
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  INVALID_MANUFACTURER_ID_FORMAT:
    "Invalid ManufacturerId format. Must be a number.",

  INVALID_USER_ID_FORMAT: "Invalid format for User ID. It must be a number.",
  INVALID_MANUFACTURER_ID:
    "Invalid format for Manufacturer ID. It must be a number.",
  INVALID_USER_TYPE: "User type is required.",
  MISSING_REQUIRED_FILEDS: "Missing required fields.",
  CART: {
    ITEM_NOT_FOUND: "Cart item not found",
    FAILED_TO_ROMOVE_ITEM: "Failed to remove item from cart",
    FAILED_TO_UPDATE_ITEM: "Failed to update cart item"
  },
  INVALID: {
    REPORT_TYPE: "Encountered an invalid report type."
  }
};
