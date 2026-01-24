import status from "http-status";
import { NextFunction, Response } from "express";

import { CustomError } from "../utils/errorUtils";
import { AuthRequest, decodeToken } from "../utils/token";

const authMiddleware = (req: AuthRequest, _: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new CustomError(status.UNAUTHORIZED, "missing or invalid token");
    }

    const { userId } = decodeToken(authHeader.split(" ")[1]);

    req.user = { id: userId };

    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
