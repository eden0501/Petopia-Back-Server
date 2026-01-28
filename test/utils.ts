import request from "supertest";
import { Express } from "express";
import jwt from "jsonwebtoken";

export type UserData = {
  email: string;
  password: string;
  username: string;
  _id: string;
  accessToken: string;
  refreshToken: string;
};

export const userData: UserData = {
  email: "test@test.com",
  password: "testpass123",
  username: "testuser",
  _id: "",
  accessToken: "",
  refreshToken: "",
};

export const getLoggedInUser = async (app: Express): Promise<UserData> => {
  const { email, password, username } = userData;
  let response = await request(app)
    .post("/auth/register")
    .send({ email, password, username });

  if (response.status !== 201) {
    response = await request(app).post("/auth/login").send({ email, password });
  }

  const decoded = jwt.decode(response.body.accessToken) as { userId: string };

  const loggedUser: UserData = {
    _id: decoded.userId,
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
    email,
    password,
    username,
  };

  return loggedUser;
};

export type PostData = {
  title: string;
  content: string;
  type: string;
  _id?: string;
};

export const postsList: PostData[] = [
  { title: "First Post", content: "This is my first post", type: "Report" },
  { title: "Second Post", content: "This is my second post", type: "Knowledge" },
  { title: "Third Post", content: "This is my third post", type: "Donation" },
];

export type CommentData = {
  content: string;
  postId: string;
  _id?: string;
};

export const commentsList: CommentData[] = [
  { content: "Great post!", postId: "" },
  { content: "Thanks for sharing", postId: "" },
  { content: "Very helpful", postId: "" },
];
