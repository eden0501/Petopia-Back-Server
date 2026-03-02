import mongoose from "mongoose";
import { UserInterface } from "../types/userInterfaces";

const userSchema = new mongoose.Schema<UserInterface>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    select: false,
    required: true,
  },
  petOwnerSince: {
    type: Date,
    default: Date.now,
  },
  petsCount: {
    type: Number,
    default: 0,
  },
  profilePicture: {
    type: String,
  },
  refreshToken: {
    select: false,
    type: String,
  },
});

export default mongoose.model("User", userSchema);
