import axios from "axios";
import { cookies } from "next/headers";
import { getCommonConfigs, handleError, handleSuccess } from "./axios";

const apiUnauthServerClient = axios.create({
  ...getCommonConfigs(),
  headers: {
    "Content-Type": "application/json"
  }
});

const apiServerClient = axios.create({
  ...getCommonConfigs(),
  headers: {
    "Content-Type": "application/json"
  }
});

apiServerClient.interceptors.request.use(
  (config) => {
    try {
      const cookieStore = cookies();
      const token = cookieStore.get("accessToken")?.value;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error("Error attaching authorization header:", err);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiServerClient.interceptors.response.use(handleSuccess, handleError);

export { apiServerClient, apiUnauthServerClient };
