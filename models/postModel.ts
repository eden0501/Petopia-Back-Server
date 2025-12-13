import mongoose from "mongoose";
import { PostTypes } from "../consts/postConsts";

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String, 
    required: true,
  }, 
  createdAt: {
    type: Date,
    default: Date.now,
  }, 
  type: {
    type: String,
    enum: Object.values(PostTypes),
    required: true
  },
  // authorId: {
  //   type: mongoose.Schema.Types.ObjectId, 
  //   required: true, 
  //   ref: "User"
  // }, 
});


export default mongoose.model("Post", postSchema)