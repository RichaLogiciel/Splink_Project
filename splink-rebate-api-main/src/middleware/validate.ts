import { Request, Response, NextFunction } from "express";
import Joi from "joi";

// Middleware function to validate request body
const validate = <T>(schema: Joi.ObjectSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // Map error details to a structured response
      const errorMessages = error.details.map((detail) => ({
        message: detail.message.replace(/"/g, ""), // Remove quotes for better readability
        field: detail.path.join(".") // Use dot notation for nested fields
      }));

      res.status(400).json({
        errors: errorMessages
      });
    } else {
      next(); // Call next middleware if validation succeeds
    }
  };
};

export default validate;
