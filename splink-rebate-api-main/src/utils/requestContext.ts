import { AsyncLocalStorage } from "async_hooks";
import { localStorageUser } from "../middleware/requestContext";

// Singleton AsyncLocalStorage instance for request context
type RequestContextType = { localStorageUser?: localStorageUser };
export const asyncLocalStorage = new AsyncLocalStorage<RequestContextType>();

export function setContext(data: RequestContextType) {
  asyncLocalStorage.enterWith(data);
}

export function getContext(): RequestContextType | undefined {
  return asyncLocalStorage.getStore();
}

export function getCurrentUser() {
  return getContext()?.localStorageUser;
}
