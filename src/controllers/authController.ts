import bcrypt from "bcrypt";
import status from "http-status";
import { NextFunction, Request, Response } from "express";

import User from "../models/userModel";
import { generateToken } from "../utils/token";
import { CustomError } from "../utils/errorUtils";

const validateBody = ({
  email,
  password,
  ...additionalInfo
}: Record<string, never>) => {
  if (!email || !password) {
    throw new CustomError(
      status.BAD_REQUEST,
      "Email and password are required",
    );
  }

  return { email, password, ...additionalInfo };
};

export const register = async (
  { body }: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password, ...additionalInfo } = validateBody(body);

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    const user = await new User({
      email,
      password: encryptedPassword,
      ...additionalInfo,
    }).save();

    res
      .status(status.CREATED)
      .json({ token: generateToken(user._id.toString()) });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  { body }: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = validateBody(body);

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      throw new CustomError(status.NOT_FOUND, "User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new CustomError(status.FORBIDDEN, "Invalid email or password");
    }

    res.status(status.OK).json({ token: generateToken(user._id.toString()) });
  } catch (error) {
    next(error);
  }
};
