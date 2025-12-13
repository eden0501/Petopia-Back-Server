import Post from '../models/postModel';
import BaseController from './baseController';
import { PostInterface } from '../types/postInterfaces';
import { mapPostQueryToFilter } from '../utils/postUtils';

const postController = new BaseController<PostInterface>(Post, mapPostQueryToFilter);

export default postController;