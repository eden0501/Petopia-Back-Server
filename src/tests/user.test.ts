import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import User from "../models/userModel";
import { userData, registerTestUser } from "../utils/testUtils";

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany({});
  await registerTestUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("User API", () => {
  test("GET /users - Get all users", async () => {
    const response = await request(app)
      .get("/users")
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(1);
    expect(response.body[0].username).toBe(userData.username);
  });

  test("GET /users/:id - Get user by ID", async () => {
    const response = await request(app)
      .get(`/users/${userData._id}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(response.body.username).toBe(userData.username);
  });

  test("PUT /users/:id - Update user", async () => {
    const updatedData = { ...userData, petsCount: 5 };
    const response = await request(app)
      .put(`/users/${userData._id}`)
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(updatedData);

    expect(response.statusCode).toBe(status.OK);
    expect(response.body.petsCount).toBe(5);
  });

  test("GET /users/:id - fail to get user by non-existent ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/users/${nonExistentId}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.NOT_FOUND);
  });
});
