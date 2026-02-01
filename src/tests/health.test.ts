import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";

let app: Express;

beforeAll(async () => {
  app = await initApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Health Check", () => {
  describe("GET /", () => {
    test("should return health check message", async () => {
      const response = await request(app).get("/");

      expect(response.statusCode).toBe(status.OK);
      expect(response.text).toBe("Health check");
    });

    test("should respond quickly", async () => {
      const startTime = Date.now();
      const response = await request(app).get("/");
      const endTime = Date.now();

      expect(response.statusCode).toBe(status.OK);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("GET /api-docs.json", () => {
    test("should return swagger documentation", async () => {
      const response = await request(app).get("/api-docs.json");

      expect(response.statusCode).toBe(status.OK);
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.body).toHaveProperty("openapi");
      expect(response.body).toHaveProperty("info");
      expect(response.body).toHaveProperty("paths");
    });
  });
});
