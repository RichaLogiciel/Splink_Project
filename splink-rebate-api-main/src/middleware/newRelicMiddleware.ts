import { NextFunction, Request, Response } from "express";
import newrelic from "newrelic";

export const newRelicMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get the current transaction
    const currentTransaction = newrelic.getTransaction();

    // Generate a unique transaction ID
    const transactionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Add transaction ID to response headers
    if (currentTransaction) {
      res.setHeader("X-NewRelic-App-Data", transactionId);
    }

    if (currentTransaction) {
      // Add request attributes to the current transaction
      newrelic.addCustomAttributes({
        method: req.method,
        url: req.originalUrl,
        query: JSON.stringify(req.query),
        params: JSON.stringify(req.params),
        transactionId: transactionId,
        userAgent: req.get("User-Agent") || "unknown",
        ip: req.ip || req.connection.remoteAddress || "unknown"
      });
    }

    // Add response finish handler for final metrics
    res.on("finish", () => {
      if (currentTransaction) {
        newrelic.addCustomAttributes({
          statusCode: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      }
    });

    // Call next() OUTSIDE of any New Relic segments
    // This ensures the middleware only measures its own overhead
    next();
  } catch (error: any) {
    newrelic.noticeError(error, {
      method: req.method,
      url: req.originalUrl,
      middleware: "newRelicMiddleware"
    });
    next(error);
  }
};
