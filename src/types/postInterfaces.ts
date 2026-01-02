import { Document, Types } from 'mongoose';
import { PostTypes } from '../consts/postConsts';

export interface PostInterface extends Document {
  title: string;
  content: string;
  type: PostTypes;
  authorId: Types.ObjectId;
  createdAt: Date;
};