import jwt from "jsonwebtoken";
import { Request } from "express";

export type AuthRequest = Request & { user?: { id: string } };

const SECRET_KEY = process.env.JWT_SECRET || "";
const EXPIRATION = parseInt(process.env.JWT_EXPIRES_IN || "3600");

export const generateToken = (userId: string) =>
  jwt.sign({ userId }, SECRET_KEY, { expiresIn: EXPIRATION });

export const decodeToken = (token: string) =>
  jwt.verify(token, SECRET_KEY) as { userId: string };
