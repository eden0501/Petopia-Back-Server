import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
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