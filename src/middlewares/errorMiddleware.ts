import status from "http-status";
import { MongooseError } from "mongoose";
import { Request, Response, NextFunction } from "express";

import { CustomError } from "../utils/errorUtils";

const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof CustomError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof MongooseError) {
    if (err.name === "ValidationError" || err.name === "CastError") {
      return res.status(status.BAD_REQUEST).json({ error: err.message });
    }

    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Database related error" });
  }

  return res
    .status(status.INTERNAL_SERVER_ERROR)
    .json({ error: "Failed to execute request due to internal server error" });
};

export default errorMiddleware;
