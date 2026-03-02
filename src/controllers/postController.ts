import status from "http-status";
import Post from "../models/postModel";
import BaseController from "./baseController";
import { NextFunction, Response } from "express";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";
import { PostInterface } from "../types/postInterfaces";

class PostController extends BaseController<PostInterface> {
  async getBatch({ query }: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(query.page ?? 1));
      const limit = parseInt(String(query.limit ?? 10));

      const filter = query.type ? { type: query.type } : {};

      const data = await Post.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(["author", "comments"])
        .lean();

      return res.status(status.OK).json({
        data,
        page,
        limit,
      });
    } catch (error) {
      return next(error);
    }
  }

  async like({ params, user }: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = user?.id;
      if (!params?.id || !userId) {
        throw new CustomError(
          status.BAD_REQUEST,
          "Post ID and User ID are required",
        );
      }

      const post = await Post.findById(params.id);

      if (!post) {
        throw new CustomError(status.NOT_FOUND, "Post not found");
      }

      if (!post.likes.some((id) => String(id) === String(userId))) {
        post.likes.push(userId);
        await post.save();
      }

      return res.status(status.OK).json(post);
    } catch (error) {
      return next(error);
    }
  }

  async unlike(
    { params, user }: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = user?.id;
      if (!params?.id || !userId) {
        throw new CustomError(
          status.BAD_REQUEST,
          "Post ID and User ID are required",
        );
      }

      const post = await Post.findById(params.id);

      if (!post) {
        throw new CustomError(status.NOT_FOUND, "Post not found");
      }

      if (post.likes.some((id) => String(id) === String(userId))) {
        post.likes = post.likes.filter((id) => String(id) !== String(userId));
        await post.save();
      }

      return res.status(status.OK).json(post);
    } catch (error) {
      return next(error);
    }
  }
}

const postController = new PostController(Post);

export default postController;
