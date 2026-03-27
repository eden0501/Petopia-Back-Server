import { Document } from "mongoose";

export interface UserInterface extends Document {
  username: string;
  email?: string;
  password?: string;
  petsCount?: number;
  petOwnerSince?: Date;
  profilePicture?: string;
  refreshToken?: string;
  googleId?: string;
}
