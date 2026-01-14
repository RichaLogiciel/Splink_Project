import { URL } from "url";

/**
 * Extracts the S3 object ID from a URL
 * @param url - The S3 pre-signed URL
 * @returns The object ID or empty string if not found
 */
export function getS3ObjectIdFromURL(url: string): string {
  if (!url) {
    return "";
  }

  const regex = /\/([^/?]+)(?=\?|$)/; // Removed unnecessary escapes
  const match = url.match(regex);
  return match ? match[1] : "";
}

/**
 * Checks if an AWS S3 pre-signed URL has expired
 * @param url - The S3 pre-signed URL to check
 * @returns true if the URL has expired, false otherwise
 */
export function isAwsImageTokenExpired(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const amzDate = parsedUrl.searchParams.get("X-Amz-Date");
    const amzExpires = parsedUrl.searchParams.get("X-Amz-Expires");

    if (!amzDate || !amzExpires) {
      throw new Error("Invalid AWS S3 pre-signed URL");
    }

    // Convert amzDate to a format that the Date constructor can understand
    const formattedAmzDate = `${amzDate.slice(0, 4)}-${amzDate.slice(4, 6)}-${amzDate.slice(6, 8)}T${amzDate.slice(9, 11)}:${amzDate.slice(11, 13)}:${amzDate.slice(13, 15)}Z`;

    const expirationTime =
      new Date(formattedAmzDate).getTime() + parseInt(amzExpires) * 1000;
    const currentTime = Date.now();

    return currentTime > expirationTime;
  } catch (error) {
    console.error("Error checking AWS image token expiration:", error);
    return true;
  }
}
