import Post from '../models/postModel';
import BaseController from './baseController';
import { mapPostQueryToFilter } from '../utils/postUtils';

const postController = new BaseController(Post, mapPostQueryToFilter);

export default postController;