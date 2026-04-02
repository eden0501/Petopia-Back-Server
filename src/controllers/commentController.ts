import status from "http-status";
import { Types } from "mongoose";
import Comment from "../models/commentModel";
import BaseController from "./baseController";
import { NextFunction, Response } from "express";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";
import { CommentInterface } from "../types/commentInterfaces";

class CommentController extends BaseController<CommentInterface> {
  async deleteById(
    { params, user }: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = user?.id;
      if (!params?.id || !userId) {
        return next(
          new CustomError(status.BAD_REQUEST, "ID and User ID are required"),
        );
      }

      const comment = await Comment.findById(params.id).populate<{
        postId: { authorId: Types.ObjectId };
      }>("postId", "authorId");

      if (!comment) {
        return next(new CustomError(status.NOT_FOUND, "Comment not found"));
      }

      const userIdStr = userId.toString();
      const isCommentAuthor = comment.authorId?.toString() === userIdStr;
      const isPostAuthor = comment.postId?.authorId?.toString() === userIdStr;

      if (!isCommentAuthor && !isPostAuthor) {
        return next(
          new CustomError(
            status.FORBIDDEN,
            "You can only delete your own comments or comments on your posts",
          ),
        );
      }

      await comment.deleteOne();

      return res.status(status.OK).send("Successfully deleted");
    } catch (error) {
      return next(error);
    }
  }
}

const commentController = new CommentController(Comment);

export default commentController;
