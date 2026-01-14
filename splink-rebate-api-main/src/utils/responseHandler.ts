import { Response } from "express";
import { StandardResponse } from "../types/StandardResponse";

/**
 * Sends a success response to the client with the given data
 * @param res The response object
 * @param data The data to be sent to the client
 * @param statusCode The HTTP status code to be sent (default is 200)
 * @returns The response object
 */
const sendSuccessResponse = <T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response => {
  // Create a standard response object with the given data
  const responseBody: StandardResponse<T> = {
    status: "success",
    data: data
  };

  // Return the response object with the given status code
  return res.status(statusCode).json(responseBody);
};

/**
 * Sends an error response to the client with the given message
 * @param res The response object
 * @param message The error message to be sent to the client
 * @param statusCode The HTTP status code to be sent (default is 500)
 * @returns The response object
 */
const sendErrorResponse = (
  res: Response,
  message: string = "An error occurred",
  statusCode: number = 500
): Response => {
  // Construct the response body with error status and message
  const responseBody: StandardResponse<{ message: string }> = {
    status: "error",
    data: message
  };

  // Send the error response with the specified status code
  return res.status(statusCode).json(responseBody);
};

export { sendSuccessResponse, sendErrorResponse };
