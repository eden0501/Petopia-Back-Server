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
        .set("Cookie", [`accessToken=${userData.accessToken}`]);

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
        .set("Cookie", ["accessToken=invalid-token"]);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /users/:id", () => {
    test("should get user by ID", async () => {
      const response = await request(app)
        .get(`/users/${userData._id}`)
        .set("Cookie", [`accessToken=${userData.accessToken}`]);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.username).toBe(userData.username);
    });

    test("should fail to get user by non-existent ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/users/${nonExistentId}`)
        .set("Cookie", [`accessToken=${userData.accessToken}`]);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("should fail to get user with invalid ID format", async () => {
      const response = await request(app)
        .get("/users/invalid-id")
        .set("Cookie", [`accessToken=${userData.accessToken}`]);

      expect(response.statusCode).toBe(status.BAD_REQUEST);
    });

    test("should fail to get user without authentication", async () => {
      const response = await request(app).get(`/users/${userData._id}`);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /users/info", () => {
    test("should get user info", async () => {
      const response = await request(app)
        .get("/users/info")
        .set("Cookie", [`accessToken=${userData.accessToken}`]);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.username).toBe(userData.username);
      expect(response.body).toHaveProperty("likesCount");
      expect(response.body).toHaveProperty("postsCount");
      expect(response.body).toHaveProperty("commentsCount");
    });

    test("should fail to get user info without authentication", async () => {
      const response = await request(app).get("/users/info");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("should fail to get user info with invalid token", async () => {
      const response = await request(app)
        .get("/users/info")
        .set("Cookie", ["accessToken=invalid-token"]);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty("error");
    });

    test("should return user with populated fields", async () => {
      const response = await request(app)
        .get("/users/info")
        .set("Cookie", [`accessToken=${userData.accessToken}`]);

      expect(response.statusCode).toBe(status.OK);
      expect(typeof response.body.likesCount).toBeDefined();
      expect(typeof response.body.postsCount).toBeDefined();
      expect(typeof response.body.commentsCount).toBeDefined();
    });
  });

  describe("PUT /users", () => {
    test("should update user", async () => {
      const response = await request(app)
        .put("/users")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({ petsCount: 5 });

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.petsCount).toBe(5);
    });

    test("should fail to update user without authentication", async () => {
      const response = await request(app)
        .put("/users")
        .send({ petsCount: 10 });

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("should update user profile picture", async () => {
      const response = await request(app)
        .put("/users")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({ profilePicture: "https://example.com/pic.jpg" });

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.profilePicture).toBe("https://example.com/pic.jpg");
    });
  });

  describe("DELETE /users", () => {
    test("should delete user and cascade", async () => {
      const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      const tempUser = { username: "delUser_" + uniqueSuffix, email: "delUser_" + uniqueSuffix + "@test.com", password: "password123" };
      const regRes = await request(app).post("/auth/register").send(tempUser);
      expect(regRes.statusCode).toBe(status.CREATED);

      const cookies = regRes.header["set-cookie"] as unknown as string[];
      const tempToken = cookies
        .find((c: string) => c.startsWith("accessToken="))!
        .split(";")[0]
        .split("=")[1];

      const response = await request(app)
        .delete("/users")
        .set("Cookie", [`accessToken=${tempToken}`]);

      expect(response.statusCode).toBe(status.OK);

      const check = await User.findOne({ username: tempUser.username });
      expect(check).toBeNull();
    });

    test("should fail to delete user without authentication", async () => {
      const response = await request(app).delete("/users");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });
});
