import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import User from "../models/userModel";
import { userData } from "../utils/testUtils";

jest.mock("google-auth-library", () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockImplementation(async ({ idToken }: { idToken: string }) => {
          if (idToken === "valid-google-token") {
            return {
              getPayload: () => ({
                email: "googleuser@example.com",
                sub: "google123",
                name: "Google User",
              }),
            };
          }
          throw new Error("Invalid token");
        }),
      };
    }),
  };
});

let app: Express;

beforeAll(async () => {
  app = await initApp();
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Auth API", () => {
  describe("POST /auth/register", () => {
    test("register as a new user", async () => {
      const response = await request(app).post("/auth/register").send(userData);

      expect(response.statusCode).toBe(status.CREATED);
      expect(response.header["set-cookie"]).toBeDefined();

      const cookies = response.header["set-cookie"] as unknown as string[] | undefined;
      if (!cookies) throw new Error("Cookies not set");
      expect(cookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
    });

    test("fail to register as an existing user", async () => {
      const response = await request(app).post("/auth/register").send(userData);

      expect(response.statusCode).toBe(status.CONFLICT);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to register with missing properties", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ username: "incompleteUser" });

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/login", () => {
    test("login user", async () => {
      const response = await request(app).post("/auth/login").send(userData);

      expect(response.statusCode).toBe(status.OK);
      expect(response.header["set-cookie"]).toBeDefined();

      const cookies = response.header["set-cookie"] as unknown as string[] | undefined;
      if (!cookies) throw new Error("Cookies not set");
      const accessTokenCookie = cookies.find((c: string) => c.startsWith("accessToken="));
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith("refreshToken="));

      expect(accessTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toBeDefined();

      userData.accessToken = accessTokenCookie!.split(";")[0].split("=")[1];
      userData.refreshToken = refreshTokenCookie!.split(";")[0].split("=")[1];
    });

    test("fail to login with wrong password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: userData.email, password: "wrong-password" });

      expect(response.statusCode).toBe(status.FORBIDDEN);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to login with non-existent user", async () => {
      const response = await request(app).post("/auth/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.statusCode).toBe(status.NOT_FOUND);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to login with missing properties", async () => {
      const missingEmailRes = await request(app).post("/auth/login").send({
        password: userData.password,
      });

      expect(missingEmailRes.statusCode).toBe(status.BAD_REQUEST);
      expect(missingEmailRes.body).toHaveProperty("error");

      const missingPasswordRes = await request(app).post("/auth/login").send({
        email: userData.email,
      });

      expect(missingPasswordRes.statusCode).toBe(status.BAD_REQUEST);
      expect(missingPasswordRes.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/refresh-token", () => {
    test("refresh token", async () => {
      const response = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", [`refreshToken=${userData.refreshToken}`]);

      expect(response.statusCode).toBe(status.OK);
      expect(response.header["set-cookie"]).toBeDefined();

      const cookies = response.header["set-cookie"] as unknown as string[] | undefined;
      if (!cookies) throw new Error("Cookies not set");
      const accessTokenCookie = cookies.find((c: string) => c.startsWith("accessToken="));
      const refreshTokenCookie = cookies.find((c: string) => c.startsWith("refreshToken="));

      userData.accessToken = accessTokenCookie!.split(";")[0].split("=")[1];
      userData.refreshToken = refreshTokenCookie!.split(";")[0].split("=")[1];
    });

    test("fail to refresh with invalid token", async () => {
      const response = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", ["refreshToken=invalid-token"]);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to refresh with missing token", async () => {
      const response = await request(app).post("/auth/refresh-token").send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/logout", () => {
    test("fail to logout without refresh token", async () => {
      const response = await request(app).post("/auth/logout").send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to logout with invalid refresh token", async () => {
      const response = await request(app)
        .post("/auth/logout")
        .set("Cookie", ["refreshToken=invalid-refresh-token"]);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty("error");
    });

    test("logout user successfully", async () => {
      const response = await request(app)
        .post("/auth/logout")
        .set("Cookie", [`refreshToken=${userData.refreshToken}`]);

      expect(response.statusCode).toBe(status.OK);
    });
  });

  describe("POST /auth/google", () => {
    test("login with valid google token", async () => {
      const response = await request(app).post("/auth/google").send({
        credential: "valid-google-token",
      });

      expect(response.statusCode).toBe(status.OK);
      expect(response.header["set-cookie"]).toBeDefined();

      const cookies = response.header["set-cookie"] as unknown as string[] | undefined;
      if (!cookies) throw new Error("Cookies not set");
      expect(cookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
    });

    test("fail to login with invalid google token", async () => {
      const response = await request(app).post("/auth/google").send({
        credential: "invalid-token",
      });

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to login with missing google token", async () => {
      const response = await request(app).post("/auth/google").send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });
  });
});
