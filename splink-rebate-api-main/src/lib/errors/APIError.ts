export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static alreadyExists(message: string) {
    return new ApiError(409, message);
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static notFound(message: string) {
    return new ApiError(404, message);
  }

  static internal(message: string) {
    return new ApiError(500, message);
  }

  static authenticationFailed(message: string) {
    return new ApiError(401, message);
  }

  static authorizationFailed(message: string) {
    return new ApiError(403, message);
  }
}
