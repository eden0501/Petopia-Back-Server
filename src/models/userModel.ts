import mongoose from "mongoose";
import { UserInterface } from "../types/userInterfaces";

const userSchema = new mongoose.Schema<UserInterface>({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: function (this: UserInterface) {
      return Boolean(this.googleId);
    },
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
    required: false,
  },
  petsCount: {
    type: Number,
    required: false,
  },
  profilePicture: {
    type: String,
  },
  refreshToken: {
    select: false,
    type: String,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

userSchema.virtual("postsCount", {
  ref: "Post",
  localField: "_id",
  foreignField: "authorId",
  count: true,
});

userSchema.virtual("commentsCount", {
  ref: "Comment",
  localField: "_id",
  foreignField: "authorId",
  count: true,
});

userSchema.virtual("likesCount", {
  ref: "Post",
  localField: "_id",
  foreignField: "likes",
  count: true,
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

export default mongoose.model("User", userSchema);
