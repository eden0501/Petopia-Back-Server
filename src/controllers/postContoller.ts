import Post from "../models/postModel";
import BaseController from "./baseController";
import { PostInterface } from "../types/postInterfaces";

const postController = new BaseController<PostInterface>(Post);

export default postController;
