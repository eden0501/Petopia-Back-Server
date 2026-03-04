import { Document } from "mongoose";

export interface UserInterface extends Document {
  email: string;
  username: string;
  password?: string;
  petOwnerSince: Date;
  petsCount: number;
  refreshToken?: string;
  googleId?: string;
}
