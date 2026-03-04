import { Types } from "mongoose";
import { Request } from "express";

export type AuthRequest = Request & {
  user?: { id: Types.ObjectId };
};
