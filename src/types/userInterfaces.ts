import { Document } from "mongoose";

export interface UserInterface extends Document {
  email: string;
  username: string;
  password?: string;
  petsCount: number;
  petOwnerSince: Date;
  profilePicture?: string;
  refreshToken?: string;
  googleId?: string;
}
