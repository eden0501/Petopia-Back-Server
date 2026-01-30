import request from "supertest";
import initApp from "../server";
import { Express } from "express";
import mongoose from "mongoose";
import Post from "../models/postModel";
import User from "../models/userModel";
import { userData, singlePostData, registerTestUser } from "../utils/testUtils";

let app: Express;

beforeAll(async () => {
    app = await initApp();
    await Post.deleteMany({});
    await User.deleteMany({});
    await registerTestUser(app);
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Post API", () => {
    let postId: string;

    test("POST /posts - Create a new post", async () => {
        const postPayload = {
            ...singlePostData,
            authorId: userData._id
        };
        const response = await request(app).post("/posts").send(postPayload);
        if (response.statusCode !== 201) {
            console.log("Create Post Failed:", response.status, response.body);
        }
        expect(response.statusCode).toBe(201);
        expect(response.body.title).toBe(singlePostData.title);
        expect(response.body.authorId).toBeDefined();
        postId = response.body._id;
    });

    test("GET /posts - Get all posts", async () => {
        const response = await request(app).get("/posts");
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBeGreaterThan(0);
    });

    test("GET /posts/:id - Get post by ID", async () => {
        const response = await request(app).get(`/posts/${postId}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.title).toBe(singlePostData.title);
    });

    test("PUT /posts/:id - Update post", async () => {
        const updatedTitle = "Updated Title";
        const postPayload = {
            ...singlePostData,
            authorId: userData._id,
            title: updatedTitle
        };
        const response = await request(app).put(`/posts/${postId}`).send(postPayload);
        expect(response.statusCode).toBe(200);
        expect(response.body.title).toBe(updatedTitle);
    });
});
