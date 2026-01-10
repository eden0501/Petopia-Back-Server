import Comment from "../models/commentModel";
import BaseController from "./baseController";
import { CommentInterface } from "../types/commentInterfaces";

const commentController = new BaseController<CommentInterface>(Comment);

export default commentController;
