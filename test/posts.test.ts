import mongoose from "mongoose";
import request from "supertest";
import { Express } from "express";
import initApp from "../src/server";
import Post from "../src/models/postModel";
import { getLoggedInUser, UserData, postsList } from "./utils";

let app: Express;
let loginUser: UserData;
let postId = "";

beforeAll(async () => {
  app = await initApp();
  await Post.deleteMany();
  loginUser = await getLoggedInUser(app);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Post Tests", () => {
  test("Create Post", async () => {
    for (const post of postsList) {
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + loginUser.accessToken)
        .send({ ...post, authorId: loginUser._id });

      if (response.status !== 201) {
        console.error("Post creation failed:", response.body);
      }
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(post.title);
      expect(response.body.content).toBe(post.content);
      expect(response.body.type).toBe(post.type);
    }
  });

  test("Get All Posts", async () => {
    const response = await request(app)
      .get("/posts")
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(postsList.length);
  });

  test("Get Posts by type", async () => {
    const response = await request(app)
      .get("/posts?type=" + postsList[0].type)
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    const testPost = response.body.find((p: { title: string; _id: string }) => p.title === postsList[0].title);
    expect(testPost).toBeDefined();
    postId = testPost._id;
  });

  test("Get Post by ID", async () => {
    const response = await request(app)
      .get("/posts/" + postId)
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe(postsList[0].title);
    expect(response.body.content).toBe(postsList[0].content);
    expect(response.body._id).toBe(postId);
  });

  test("Update Post", async () => {
    const response = await request(app)
      .put("/posts/" + postId)
      .set("Authorization", "Bearer " + loginUser.accessToken)
      .send({ 
        ...postsList[0], 
        title: "Updated Title",
        content: "Updated content",
        authorId: loginUser._id 
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Updated Title");
    expect(response.body.content).toBe("Updated content");
  });
});
