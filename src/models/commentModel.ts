import mongoose from "mongoose";

import User from "./userModel";
import Post from "./postModel";
import { CommentInterface } from "../types/commentInterfaces";

const commentSchema = new mongoose.Schema<CommentInterface>({
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Post",
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

commentSchema.pre("validate", async function () {
  const isPostExist = await Post.exists({ _id: this.postId });
  const isUserExist = await User.exists({ _id: this.authorId });

  if (!isPostExist) {
    const err = new mongoose.Error.ValidatorError({
      message: "Post does not exist",
      path: "postId",
    });

    const validationError = new mongoose.Error.ValidationError();
    validationError.addError("postId", err);
    throw validationError;
  }

  if (!isUserExist) {
    const err = new mongoose.Error.ValidatorError({
      message: "Author does not exist",
      path: "authorId",
    });

    const validationError = new mongoose.Error.ValidationError();
    validationError.addError("authorId", err);
    throw validationError;
  }
});

export default mongoose.model("Comment", commentSchema);
