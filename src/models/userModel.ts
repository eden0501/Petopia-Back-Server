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
    required: function (this: UserInterface) {
      return !this.googleId;
    },
  },
  petOwnerSince: {
    type: Date,
    default: Date.now,
  },
  petsCount: {
    type: Number,
    default: 0,
  },
  refreshToken: {
    type: String,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

export default mongoose.model("User", userSchema);
