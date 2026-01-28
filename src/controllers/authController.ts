import bcrypt from "bcrypt";
import status from "http-status";
import User from "../models/userModel";
import { CustomError } from "../utils/errorUtils";
import { NextFunction, Request, Response } from "express";
import { decodeToken, generateTokens } from "../utils/token";

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

    const user = new User({
      email,
      password: encryptedPassword,
      ...additionalInfo,
    });

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;

    await user.save();

    res.status(status.CREATED).json(tokens);
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

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;

    await user.save();

    res.status(status.OK).json(tokens);
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new CustomError(status.BAD_REQUEST, "Refresh token is required");
    }

    const { userId } = decodeToken(refreshToken, true);

    const user = await User.findById(userId);

    if (!user) {
      throw new CustomError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    user.refreshToken = undefined;

    await user.save();

    res.status(status.OK).send();
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new CustomError(status.BAD_REQUEST, "Refresh token is required");
    }

    const { userId } = decodeToken(refreshToken, true);

    const user = await User.findById(userId);

    if (!user) {
      throw new CustomError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    if (!(user.refreshToken = refreshToken)) {
      user.refreshToken = undefined;
      await user.save();

      throw new CustomError(status.FORBIDDEN, "Invalid refresh token");
    }

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;

    await user.save();

    res.status(status.OK).json(tokens);
  } catch (error) {
    next(error);
  }
};

export default { register, login, logout, refreshToken };
