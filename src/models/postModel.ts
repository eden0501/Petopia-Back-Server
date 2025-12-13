import mongoose from 'mongoose';

import User from './userModel';
import { PostTypes } from '../consts/postConsts';

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
    required: true,
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
});

postSchema.pre('save', async function () {
  const isExist = await User.exists({ _id: this.authorId });

  if (!isExist) {
    throw new Error('Author does not exist');
  }
});

export default mongoose.model('Post', postSchema);
