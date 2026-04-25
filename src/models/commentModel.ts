import mongoose from "mongoose";
import { isEmpty } from "lodash";

import Post from "./postModel";
import User from "./userModel";
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

commentSchema.virtual("author", {
  ref: "User",
  localField: "authorId",
  foreignField: "_id",
  justOne: true,
});

commentSchema.set("toJSON", { virtuals: true });
commentSchema.set("toObject", { virtuals: true });

commentSchema.pre("validate", async function () {
  const validationError = new mongoose.Error.ValidationError();
  const isPostExist = await Post.exists({ _id: this.postId });
  const isUserExist = await User.exists({ _id: this.authorId });

  if (!isPostExist) {
    validationError.addError(
      "postId",
      new mongoose.Error.ValidatorError({
        message: "Post does not exist",
        path: "postId",
      }),
    );
  }

  if (!isUserExist) {
    validationError.addError(
      "authorId",
      new mongoose.Error.ValidatorError({
        message: "Author does not exist",
        path: "authorId",
      }),
    );
  }

  if (!isEmpty(validationError.errors)) {
    throw validationError;
  }
});

export default mongoose.model("Comment", commentSchema);
