export interface StandardResponse<T> {
  status: "success" | "error";
  data: T | string;
}
