import mongoose from "mongoose";

import User from "./userModel";
import { PostTypes } from "../consts/postConsts";
import { PostInterface } from "../types/postInterfaces";

const postSchema = new mongoose.Schema<PostInterface>({
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
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
});

postSchema.pre("validate", async function () {
  const isExist = await User.exists({ _id: this.authorId });

  if (!isExist) {
    const err = new mongoose.Error.ValidatorError({
      message: "Author does not exist",
      path: "authorId",
    });

    const validationError = new mongoose.Error.ValidationError();
    validationError.addError("authorId", err);
    throw validationError;
  }
});

export default mongoose.model("Post", postSchema);
