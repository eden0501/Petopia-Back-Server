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
        .send({ username: userData.username, password: "wrong-password" });

      expect(response.statusCode).toBe(status.FORBIDDEN);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to login with non-existent user", async () => {
      const response = await request(app).post("/auth/login").send({
        username: "nonexistentuser",
        password: "password123",
      });

      expect(response.statusCode).toBe(status.NOT_FOUND);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to login with missing properties", async () => {
      const missingUsernameRes = await request(app).post("/auth/login").send({
        password: userData.password,
      });

      expect(missingUsernameRes.statusCode).toBe(status.BAD_REQUEST);
      expect(missingUsernameRes.body).toHaveProperty("error");

      const missingPasswordRes = await request(app).post("/auth/login").send({
        username: userData.username,
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

    test("fail to refresh with reused (old) refresh token", async () => {
      // Login to get fresh tokens
      const loginRes = await request(app).post("/auth/login").send(userData);
      const loginCookies = loginRes.header["set-cookie"] as unknown as string[];
      const oldRefreshToken = loginCookies
        .find((c: string) => c.startsWith("refreshToken="))!
        .split(";")[0]
        .split("=")[1];

      // Wait so the new token will have a different iat
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Refresh once to invalidate the old token
      const refreshRes = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", [`refreshToken=${oldRefreshToken}`]);
      expect(refreshRes.statusCode).toBe(status.OK);

      // Try to reuse the old refresh token - should be forbidden
      const reuseRes = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", [`refreshToken=${oldRefreshToken}`]);

      expect(reuseRes.statusCode).toBe(status.FORBIDDEN);
      expect(reuseRes.body).toHaveProperty("error");

      // Re-login to restore valid tokens for subsequent tests
      const reLoginRes = await request(app).post("/auth/login").send(userData);
      const reLoginCookies = reLoginRes.header["set-cookie"] as unknown as string[];
      userData.accessToken = reLoginCookies
        .find((c: string) => c.startsWith("accessToken="))!
        .split(";")[0]
        .split("=")[1];
      userData.refreshToken = reLoginCookies
        .find((c: string) => c.startsWith("refreshToken="))!
        .split(";")[0]
        .split("=")[1];
    });

    test("fail to refresh when user no longer exists", async () => {
      const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      const tempUser = { username: "tempRefresh_" + uniqueSuffix, email: "tempRefresh_" + uniqueSuffix + "@test.com", password: "password123" };
      const regRes = await request(app).post("/auth/register").send(tempUser);
      expect(regRes.statusCode).toBe(status.CREATED);

      const regCookies = regRes.header["set-cookie"] as unknown as string[];
      const tempRefreshToken = regCookies
        .find((c: string) => c.startsWith("refreshToken="))!
        .split(";")[0]
        .split("=")[1];

      await User.deleteOne({ username: tempUser.username });

      const response = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", [`refreshToken=${tempRefreshToken}`]);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
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

    test("fail to logout when user no longer exists", async () => {
      const uniqueSuffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      const tempUser = { username: "tempLogout_" + uniqueSuffix, email: "tempLogout_" + uniqueSuffix + "@test.com", password: "password123" };
      const regRes = await request(app).post("/auth/register").send(tempUser);
      expect(regRes.statusCode).toBe(status.CREATED);

      const regCookies = regRes.header["set-cookie"] as unknown as string[];
      const tempRefreshToken = regCookies
        .find((c: string) => c.startsWith("refreshToken="))!
        .split(";")[0]
        .split("=")[1];

      await User.deleteOne({ username: tempUser.username });

      const response = await request(app)
        .post("/auth/logout")
        .set("Cookie", [`refreshToken=${tempRefreshToken}`]);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
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

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to login with missing google token", async () => {
      const response = await request(app).post("/auth/google").send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });

    test("re-login existing google user", async () => {
      // The google user was created in the first google test
      const response = await request(app).post("/auth/google").send({
        credential: "valid-google-token",
      });

      expect(response.statusCode).toBe(status.OK);
      expect(response.header["set-cookie"]).toBeDefined();
    });

    test("fail to login with password for Google-only user", async () => {
      // The google user was created in the first test of this describe block
      const googleUser = await User.findOne({ googleId: "google123" });
      expect(googleUser).not.toBeNull();

      const response = await request(app).post("/auth/login").send({
        username: googleUser!.username,
        password: "anypassword123",
      });

      expect(response.statusCode).toBe(status.FORBIDDEN);
      expect(response.body.error).toContain("Google");
    });
  });
});
