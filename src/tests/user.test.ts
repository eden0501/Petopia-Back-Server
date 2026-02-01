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
  describe("GET /users", () => {
    test("should get all users", async () => {
      const response = await request(app)
        .get("/users")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(1);
      expect(response.body[0].username).toBe(userData.username);
    });

    test("should fail to get users without authentication", async () => {
      const response = await request(app).get("/users");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("should fail to get users with invalid token", async () => {
      const response = await request(app)
        .get("/users")
        .set("Authorization", "Bearer invalid-token");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /users/:id", () => {
    test("should get user by ID", async () => {
      const response = await request(app)
        .get(`/users/${userData._id}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.username).toBe(userData.username);
    });

    test("should fail to get user by non-existent ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/users/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("should fail to get user with invalid ID format", async () => {
      const response = await request(app)
        .get("/users/invalid-id")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
    });

    test("should fail to get user without authentication", async () => {
      const response = await request(app).get(`/users/${userData._id}`);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /users/:id", () => {
    test("should update user", async () => {
      const updatedData = { ...userData, petsCount: 5 };
      const response = await request(app)
        .put(`/users/${userData._id}`)
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(updatedData);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.petsCount).toBe(5);
    });

    test("should fail to update user without authentication", async () => {
      const updatedData = { ...userData, petsCount: 10 };
      const response = await request(app)
        .put(`/users/${userData._id}`)
        .send(updatedData);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("should fail to update non-existent user", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updatedData = { ...userData, petsCount: 10 };
      const response = await request(app)
        .put(`/users/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(updatedData);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("should fail to update user with invalid ID format", async () => {
      const updatedData = { ...userData, petsCount: 10 };
      const response = await request(app)
        .put("/users/invalid-id")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(updatedData);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
    });
  });
});
