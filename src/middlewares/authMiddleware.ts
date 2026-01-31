import status from "http-status";
import { NextFunction, Response } from "express";

import { decodeToken } from "../utils/token";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";

const authMiddleware = (req: AuthRequest, _: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError(status.UNAUTHORIZED, "Missing or invalid token");
    }

    const { userId } = decodeToken(authHeader.split(" ")[1]);

    req.user = { id: userId };

    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
