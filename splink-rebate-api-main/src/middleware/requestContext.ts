import { NextFunction, Request, Response } from "express";
import { asyncLocalStorage } from "../utils/requestContext";

export interface localStorageUser {
  userId: number;
  id: number;
  email: string;
  role: string;
  associatedUserId: number;
  parentEntityId: number;
  parentEntityType: string;
  isMultiRole: boolean;
  iat: number;
  exp: number;
}

declare module "express-serve-static-core" {
  interface Request {
    localStorageUser?: localStorageUser;
  }
}

export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  asyncLocalStorage.run({ localStorageUser: req.user }, () => {
    req.localStorageUser = req.user;
    next();
  });
}
