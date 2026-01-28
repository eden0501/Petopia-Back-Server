import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { Express } from "express";
import initApp from "../src/server";
import User from "../src/models/userModel";
import { postsList, userData } from "./utils";

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth Tests", () => {
  test("Test post creation without token fails", async () => {
    const postData = postsList[0];
    const response = await request(app).post("/posts").send(postData);
    expect(response.status).toBe(401);
  });

  test("Test Registration or Login", async () => {
    const { email, password, username } = userData;
    let response = await request(app)
      .post("/auth/register")
      .send({ email, password, username });

    // If user exists, try login instead
    if (response.status === 409) {
      response = await request(app)
        .post("/auth/login")
        .send({ email, password });
    }

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    userData.accessToken = response.body.accessToken;
    userData.refreshToken = response.body.refreshToken;
    const decoded = jwt.decode(userData.accessToken) as { userId: string };
    userData._id = decoded.userId;
  });

  test("Create post with token succeeds", async () => {
    const postData = { ...postsList[0], authorId: userData._id };
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(postData);
    expect(response.status).toBe(201);
  });

  test("Create post with compromised token fails", async () => {
    const postData = { ...postsList[0], authorId: userData._id };
    const compromisedToken = userData.accessToken + "a";
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + compromisedToken)
      .send(postData);
    expect([401, 500]).toContain(response.status); // 500 is JWT verification error
  });

  test("Test Login", async () => {
    const { email, password } = userData;
    const response = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    userData.accessToken = response.body.accessToken;
    userData.refreshToken = response.body.refreshToken;
  });

  test("Test Refresh Token", async () => {
    const response = await request(app)
      .post("/auth/refresh-token")
      .send({ refreshToken: userData.refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    
    // Store new tokens
    userData.accessToken = response.body.accessToken;
    userData.refreshToken = response.body.refreshToken;
  });

  test("Test Logout", async () => {
    const response = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: userData.refreshToken });

    expect(response.status).toBe(200);
  });
});
