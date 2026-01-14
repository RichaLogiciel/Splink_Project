import crypto from "crypto";

export const createCacheKey = (prefix: string, key: { [key: string]: any }) => {
  const values = Object.values(key)
    .map((v) => (v === undefined ? "null" : v))
    .join("_");
  return `${prefix}_${getHashedCacheKey(values)}`;
};

export const getHashedCacheKey = (key: string) => {
  return crypto.createHash("md5").update(key).digest("hex");
};
