import status from "http-status";
import { MongooseError } from "mongoose";
import { MongoServerError } from "mongodb";
import { Request, Response, NextFunction } from "express";

import { CustomError } from "../utils/errorUtils";

const MONGO_ERR_DUPLICATE_KEY = 11000;

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

  if (error instanceof MongoServerError) {
    if (error.code === MONGO_ERR_DUPLICATE_KEY) {
      return res.status(status.CONFLICT).json({ error: "Duplicate key error" });
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
