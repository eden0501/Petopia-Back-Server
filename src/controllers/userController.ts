import status from "http-status";
import Post from "../models/postModel";
import User from "../models/userModel";
import Comment from "../models/commentModel";
import BaseController from "./baseController";
import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/authRequest";
import { UserInterface } from "../types/userInterfaces";

class UserController extends BaseController<UserInterface> {
  async getUserInfo({ user }: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userInfo = await User.findById(user?.id).lean();

      const [stats] = await Post.aggregate([
        { $match: { authorId: user?.id } },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "postId",
            as: "postComments",
          },
        },
        {
          $group: {
            _id: null,
            postsCount: { $sum: 1 },
            likesCount: { $sum: { $size: "$likes" } },
            commentsCount: { $sum: { $size: "$postComments" } },
          },
        },
      ]);

      return res.status(status.OK).json({
        ...userInfo,
        postsCount: stats?.postsCount || 0,
        likesCount: stats?.likesCount || 0,
        commentsCount: stats?.commentsCount || 0,
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateSelf(
    { user, body, file }: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const profilePicture = file ? `/uploads/${file.filename}` : undefined;

      const updatedData = await User.findByIdAndUpdate(
        user?.id,
        { ...body, ...(profilePicture && { profilePicture }) },
        {
          new: true,
          runValidators: true,
        },
      );

      return res.status(status.OK).json(updatedData);
    } catch (error) {
      return next(error);
    }
  }

  async deleteSelf({ user }: AuthRequest, res: Response, next: NextFunction) {
    try {
      await User.findByIdAndDelete(user?.id);

      const userPosts = await Post.find({ authorId: user?.id });

      await Comment.deleteMany({
        $or: [
          { authorId: user?.id },
          { postId: { $in: userPosts.map((post) => post._id) } },
        ],
      });

      await Post.deleteMany({ authorId: user?.id });

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return res.status(status.OK).send("User successfully deleted");
    } catch (error) {
      return next(error);
    }
  }
}

const userController = new UserController(User);

export default userController;
