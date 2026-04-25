import User from "./userModel";
import mongoose from "mongoose";
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
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: [],
    },
  ],
  imageUrl: {
    type: String,
  },
  hashtags: [
    {
      type: String,
      default: [],
    },
  ],
});

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "postId",
});

postSchema.virtual("author", {
  ref: "User",
  localField: "authorId",
  foreignField: "_id",
  justOne: true,
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

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
