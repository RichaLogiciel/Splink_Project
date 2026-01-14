import jwt from "jsonwebtoken";

export function generateJwtToken(email: string): string {
  try {
    const { JWT_SECRET, INVITE_JWT_EXPIRES_IN } = process.env;
    return jwt.sign({ email }, JWT_SECRET || "", {
      expiresIn: INVITE_JWT_EXPIRES_IN || "24h"
    });
  } catch {
    throw new Error(
      "Failed to generate an invite token. Please try again later or contact support if the issue persists."
    );
  }
}
