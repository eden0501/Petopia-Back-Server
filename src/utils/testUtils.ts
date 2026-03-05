import { omit } from "lodash";
import request from "supertest";
import { Express } from "express";
import User from "../models/userModel";
import { PostTypes } from "../consts/postConsts";
import { UserInterface } from "../types/userInterfaces";
import { PostInterface } from "../types/postInterfaces";
import { CommentInterface } from "../types/commentInterfaces";

export const userData = {
  username: "testUser",
  email: "test@user.com",
  password: "password123",
  petOwnerSince: new Date("1990-01-01"),
  petsCount: 1,
} as UserInterface & { accessToken?: string };

export const postsData = [
  {
    title: "Test Post",
    content: "This is a test post content",
    type: PostTypes.OTHER,
  },
  {
    title: "Test Post 2",
    content: "This is a test post content 2",
    type: PostTypes.DONATION,
  },
  {
    title: "Test Post 3",
    content: "This is a test post content 3",
    type: PostTypes.DONATION,
  },
] as PostInterface[];

export const commentsData = [
  {
    content: "Test Comment 1",
  },
  {
    content: "Test Comment 2",
  },
] as CommentInterface[];

export const registerTestUser = async (app: Express) => {
  await User.deleteMany({ email: userData.email });

  const response = await request(app)
    .post("/auth/register")
    .send(omit(userData, ["accessToken", "refreshToken", "_id"]));

  const cookies = response.header["set-cookie"] as unknown as string[] | undefined;
  if (cookies) {
    const accessTokenCookie = cookies.find((c: string) => c.startsWith("accessToken="));
    const refreshTokenCookie = cookies.find((c: string) => c.startsWith("refreshToken="));

    if (accessTokenCookie) {
      userData.accessToken = accessTokenCookie.split(";")[0].split("=")[1];
    }
    if (refreshTokenCookie) {
      userData.refreshToken = refreshTokenCookie.split(";")[0].split("=")[1];
    }

    const user = await User.findOne({ email: userData.email });

    if (user) {
      userData._id = user._id;
    }
  }
};
