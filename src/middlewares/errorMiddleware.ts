import status from "http-status";
import { MongooseError } from "mongoose";
import { Request, Response, NextFunction } from "express";

import { CustomError } from "../utils/errorUtils";

const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof CustomError) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error instanceof MongooseError) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(status.BAD_REQUEST).json({ error: error.message });
    }

    return res
      .status(status.INTERNAL_SERVER_ERROR)
      .json({ error: "Database related error" });
  }

  return res
    .status(status.INTERNAL_SERVER_ERROR)
    .json({ error: "Something went wrong, please try again later" });
};

export default errorMiddleware;
