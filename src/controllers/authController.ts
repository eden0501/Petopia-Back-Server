import bcrypt from "bcrypt";
import status from "http-status";
import User from "../models/userModel";
import { CustomError } from "../utils/errorUtils";
import { NextFunction, Request, Response } from "express";
import { decodeToken, generateTokens, getAuthCookiesOptions } from "../utils/token";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    res.cookie("accessToken", tokens.accessToken, getAuthCookiesOptions(tokens.accessToken))
    res.cookie("refreshToken", tokens.refreshToken, getAuthCookiesOptions(tokens.refreshToken));
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

    if (!user.password) {
      throw new CustomError(status.FORBIDDEN, "Please login with Google");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new CustomError(status.FORBIDDEN, "Invalid email or password");
    }

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;

    await user.save();

    res.cookie("accessToken", tokens.accessToken, getAuthCookiesOptions(tokens.accessToken))
    res.cookie("refreshToken", tokens.refreshToken, getAuthCookiesOptions(tokens.refreshToken));
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
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

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

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

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
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      throw new CustomError(status.BAD_REQUEST, "Refresh token is required");
    }

    const { userId } = decodeToken(refreshToken, true);

    const user = await User.findById(userId);

    if (!user) {
      throw new CustomError(status.UNAUTHORIZED, "Invalid refresh token");
    }

    if (user.refreshToken !== refreshToken) {
      user.refreshToken = undefined;
      await user.save();

      throw new CustomError(status.FORBIDDEN, "Invalid refresh token");
    }

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;

    await user.save();

    res.cookie("accessToken", tokens.accessToken, getAuthCookiesOptions(tokens.accessToken))
    res.cookie("refreshToken", tokens.refreshToken, getAuthCookiesOptions(tokens.refreshToken));
    res.status(status.OK).json(tokens);
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      throw new CustomError(status.BAD_REQUEST, "Google credential is required");
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new CustomError(status.BAD_REQUEST, "Invalid Google token");
    }

    const { email, sub: googleId, name } = payload;
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        username: name || email.split("@")[0],
        googleId,
        petsCount: 0,
        petOwnerSince: new Date(),
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
    }

    const tokens = generateTokens(user._id.toString());
    user.refreshToken = tokens.refreshToken;

    await user.save();

    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.cookie("accessToken", tokens.accessToken, getAuthCookiesOptions(tokens.accessToken))
    res.cookie("refreshToken", tokens.refreshToken, getAuthCookiesOptions(tokens.refreshToken));
    res.status(status.OK).json(tokens);
  } catch (error) {
    next(error);
  }
};

export default { register, login, logout, refreshToken, googleLogin };
