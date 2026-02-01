import { Document } from "mongoose";

export interface UserInterface extends Document {
  email: string;
  username: string;
  password: string;
  dateOfBirth: Date;
  petsCount: number;
  refreshToken?: string;
}
