import { getCookie } from "@/utils/getCookie";
import axios from "axios";
import { getCommonConfigs, handleError, handleSuccess } from "./axios";

export const getClientAuthHeaders = () => {
  const token = getCookie("accessToken");

  return {
    Authorization: `Bearer ${token}`
  };
};

export const apiClient = axios.create({
  ...getCommonConfigs(),
  headers: {
    "Content-Type": "application/json",
    ...getClientAuthHeaders()
  }
});

// Extended API Client
export const apiClientExtended = (params: any) =>
  axios.create({
    ...getCommonConfigs(),
    headers: {
      "Content-Type": "application/json",
      ...getClientAuthHeaders(),
      ...params.headers
    },
    ...params
  });

// Response interceptor to handle global error cases
apiClient.interceptors.response.use(handleSuccess, handleError);
