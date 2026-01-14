import { Request, Response, NextFunction } from "express";
import { StandardResponse } from "../types/StandardResponse";

// Wrapper function to handle async errors
const asyncHandler = <T>(
  fn: (
    req: Request,
    res: Response<StandardResponse<T>>,
    next: NextFunction
  ) => Promise<Response<StandardResponse<T>>>
) => {
  return (
    req: Request,
    res: Response<StandardResponse<T>>,
    next: NextFunction
  ) => {
    fn(req, res, next).catch(next); // Catch any errors and pass to next()
  };
};

export default asyncHandler;
