import { AxiosResponse } from "axios";
export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
}

export const getCommonConfigs = () => {
  return {
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    timeout: 60000 // Timeout after 60 seconds
  };
};

export const handleSuccess = (res: AxiosResponse) => {
  // console.log("# API Success", res.config.url, res.data);
  return res.data;
};

export const handleError = (error: any) => {
  // console.log("# API Error", error.response.config.url, error.response.data);

  if (error.response?.status === 401) {
    // Handle unauthorized access (401)
  }

  return Promise.reject(error?.response?.data);
};
