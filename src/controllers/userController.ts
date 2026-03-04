import status from "http-status";
import User from "../models/userModel";
import BaseController from "./baseController";
import { NextFunction, Response } from "express";
import { AuthRequest } from "../types/authRequest";
import { UserInterface } from "../types/userInterfaces";

class UserController extends BaseController<UserInterface> {
  async getUserInfo({ user }: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userInfo = await User.findById(user?.id)
        .populate(["likesCount", "postsCount", "commentsCount"])
        .lean();

      return res.status(status.OK).json(userInfo);
    } catch (error) {
      return next(error);
    }
  }
}

const userController = new UserController(User);

export default userController;
