import { ApiError } from "../../lib/errors/APIError";

describe("ApiError", () => {
  describe("constructor", () => {
    it("should create an ApiError instance with correct properties", () => {
      const message = "Test error message";
      const statusCode = 400;
      const error = new ApiError(statusCode, message);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
    });
  });

  describe("static methods", () => {
    it("should create a bad request error", () => {
      const message = "Bad request message";
      const error = ApiError.badRequest(message);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(message);
    });

    it("should create a not found error", () => {
      const message = "Not found message";
      const error = ApiError.notFound(message);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe(message);
    });

    it("should create an internal server error", () => {
      const message = "Internal server error message";
      const error = ApiError.internal(message);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(message);
    });

    it("should create an authentication failed error", () => {
      const message = "Authentication failed message";
      const error = ApiError.authenticationFailed(message);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(message);
    });

    it("should create an authorization failed error", () => {
      const message = "Authorization failed message";
      const error = ApiError.authorizationFailed(message);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe(message);
    });
  });
});
