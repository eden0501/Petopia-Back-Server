import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import User from "../models/userModel";
import { userData, registerTestUser } from "../utils/testUtils";

jest.mock("@google/generative-ai", () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: jest.fn().mockReturnValue({
                    startChat: jest.fn().mockReturnValue({
                        sendMessage: jest.fn().mockResolvedValue({
                            response: {
                                text: () => "Mocked AI Response: Use consistency and positive reinforcement."
                            }
                        })
                    })
                }),
            };
        }),
    };
});

let app: Express;

beforeAll(async () => {
    process.env.GEMINI_API_KEY = "dummy_key";
    app = await initApp();
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
    });
});
