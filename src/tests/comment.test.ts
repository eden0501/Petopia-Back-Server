import request from "supertest";
import initApp from "../server";
import { Express } from "express";
import mongoose from "mongoose";
import Comment from "../models/commentModel";
import Post from "../models/postModel";
import User from "../models/userModel";
import { userData, singlePostData, commentsData, registerTestUser } from "../utils/testUtils";

let app: Express;
let postId: string;

beforeAll(async () => {
    app = await initApp();
    await Comment.deleteMany({});
    await Post.deleteMany({});
    await User.deleteMany({});
    
    await registerTestUser(app);
    
    // Create a post to attach comments to
    const post = await Post.create({
        ...singlePostData,
        authorId: userData._id
    });
    postId = post._id.toString();
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe("Comment API", () => {
    let commentId: string;

    test("POST /comments - Create a new comment", async () => {
        const commentPayload = {
            ...commentsData[0],
            postId: postId,
            authorId: userData._id
        };
        const response = await request(app).post("/comments").send(commentPayload);
        expect(response.statusCode).toBe(201);
        expect(response.body.content).toBe(commentsData[0].content);
        commentId = response.body._id;
    });

    test("GET /comments - Get all comments", async () => {
        const response = await request(app).get("/comments");
        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBeGreaterThan(0);
    });

    test("DELETE /comments/:id - Delete comment", async () => {
        const response = await request(app).delete(`/comments/${commentId}`);
        expect(response.statusCode).toBe(200);
        
        // Verify deletion
        const check = await Comment.findById(commentId);
        expect(check).toBeNull();
    });
});
