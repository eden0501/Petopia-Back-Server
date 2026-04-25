import status from "http-status";
import { Types } from "mongoose";
import { decodeToken } from "../utils/token";
import { NextFunction, Response } from "express";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";

const authMiddleware = (req: AuthRequest, _: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      throw new CustomError(status.UNAUTHORIZED, "Missing or invalid token");
    }

    const { userId } = decodeToken(token);

    if (!Types.ObjectId.isValid(userId)) {
      throw new CustomError(status.UNAUTHORIZED, "Invalid token payload");
    }

    const objectId = new Types.ObjectId(userId);

    req.user = { id: objectId };

    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
