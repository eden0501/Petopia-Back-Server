import mongoose from "mongoose";
import { UserInterface } from "../types/userInterfaces";

const userSchema = new mongoose.Schema<UserInterface>({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String, 
    required: true,
  }, 
  dateOfBirth: {
    type: Date, 
    default: Date.now,
  },
  petsCount: {
    type: Number, 
    default: 0, 
  }
});


export default mongoose.model("User", userSchema);
