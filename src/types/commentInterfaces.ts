import { Document, Types } from "mongoose";

export interface CommentInterface extends Document {
  content: string;
  postId: Types.ObjectId;
  authorId: Types.ObjectId;
  createdAt: Date;
};
