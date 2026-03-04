import status from "http-status";
import Post from "../models/postModel";
import BaseController from "./baseController";
import { NextFunction, Response } from "express";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";
import { PostInterface } from "../types/postInterfaces";

class PostController extends BaseController<PostInterface> {
  async getBatch(
    { query: { page, limit, ...query } }: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const parsePage = parseInt(String(page ?? 0));
      const parseLimit = parseInt(String(limit ?? 10));

      const posts = await Post.find(query || {})
        .sort({ createdAt: -1, _id: -1 })
        .skip(parsePage * parseLimit)
        .limit(parseLimit)
        .populate("author")
        .populate({
          path: "comments",
          populate: {
            path: "author",
            model: "User",
            select: "username profilePicture",
          },
        })
        .lean();

      return res.status(status.OK).json({
        posts,
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

      if (!post.likes.includes(userId)) {
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

      if (post.likes.includes(userId)) {
        post.likes = post.likes.filter((id) => !id.equals(userId));
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
