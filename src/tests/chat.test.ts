import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import User from "../models/userModel";
import Post from "../models/postModel";
import Comment from "../models/commentModel";
import { PostTypes } from "../consts/postConsts";
import { userData, registerTestUser } from "../utils/testUtils";

jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: jest.fn().mockReturnValue({
          startChat: jest.fn().mockReturnValue({
            sendMessage: jest.fn().mockResolvedValue({
              response: {
                text: () =>
                  "Mocked AI Response: Use consistency and positive reinforcement.",
              },
            }),
          }),
        }),
      };
    }),
  };
});

let app: Express;

beforeAll(async () => {
  process.env.GEMINI_API_KEY = "dummy_key";
  app = await initApp();
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await User.deleteMany({});
  await registerTestUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Chat API", () => {
  describe("POST /chat", () => {
    test("successfully get AI response", async () => {
      const response = await request(app)
        .post("/chat")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({ message: "How do I train my dog?" });

      expect(response.statusCode).toBe(status.OK);
      expect(response.body).toHaveProperty("response");
      expect(response.body.response).toContain("Mocked AI Response");
    });

    test("fail with missing message", async () => {
      const response = await request(app)
        .post("/chat")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error", "Message is required");
    });

    test("fail without authentication", async () => {
      const response = await request(app)
        .post("/chat")
        .send({ message: "Hello" });

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
    });

    test("fail with invalid API key configuration", async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const response = await request(app)
        .post("/chat")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({ message: "Hello" });

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
      expect(response.body).toHaveProperty("error", "AI configuration error");

      process.env.GEMINI_API_KEY = originalKey;
    });

    test("successfully send message with history", async () => {
      const response = await request(app)
        .post("/chat")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({
          message: "What about feeding?",
          history: [
            { role: "user", parts: [{ text: "How do I train my dog?" }] },
            { role: "model", parts: [{ text: "Use positive reinforcement." }] },
          ],
        });

      expect(response.statusCode).toBe(status.OK);
      expect(response.body).toHaveProperty("response");
    });

    test("successfully send message with history starting with model role", async () => {
      const response = await request(app)
        .post("/chat")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({
          message: "Tell me more",
          history: [
            { role: "model", parts: [{ text: "Welcome!" }] },
            { role: "user", parts: [{ text: "Hi" }] },
            { role: "model", parts: [{ text: "How can I help?" }] },
          ],
        });

      expect(response.statusCode).toBe(status.OK);
      expect(response.body).toHaveProperty("response");
    });
  });

  describe("POST /chat with user context", () => {
    let postId: string;

    beforeAll(async () => {
      const postRes = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({
          title: "My Dog",
          content: "He is great",
          type: PostTypes.OTHER,
        });
      postId = postRes.body._id;

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({ content: "Nice post!", postId });

      const uniqueSuffix =
        Date.now() + "_" + Math.random().toString(36).slice(2, 7);
      const secondUser = {
        username: "chatCtx_" + uniqueSuffix,
        email: "chatCtx_" + uniqueSuffix + "@test.com",
        password: "password123",
      };
      const regRes = await request(app).post("/auth/register").send(secondUser);
      expect(regRes.statusCode).toBe(status.CREATED);

      const cookies = regRes.header["set-cookie"] as unknown as string[];
      const secondToken = cookies
        .find((c: string) => c.startsWith("accessToken="))!
        .split(";")[0]
        .split("=")[1];

      const post2Res = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${secondToken}`])
        .send({
          title: "Community Post",
          content: "Hello everyone",
          type: PostTypes.KNOWLEDGE,
        });

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${secondToken}`])
        .send({ content: "Great community!", postId: post2Res.body._id });
    });

    test("chat includes user context from posts and comments", async () => {
      const response = await request(app)
        .post("/chat")
        .set("Cookie", [`accessToken=${userData.accessToken}`])
        .send({ message: "What should I feed my dog?" });

      expect(response.statusCode).toBe(status.OK);
      expect(response.body).toHaveProperty("response");
    });
  });
});
