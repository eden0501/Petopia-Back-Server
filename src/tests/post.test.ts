import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import Post from "../models/postModel";
import User from "../models/userModel";
import { userData, postsData, registerTestUser } from "../utils/testUtils";

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
    let response;

    for (const post of postsData) {
      response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({
          ...post,
          authorId: userData._id,
        });

      expect(response.statusCode).toBe(status.CREATED);
      expect(response.body.title).toBe(post.title);
      expect(response.body.authorId).toBe(userData._id.toString());
    }

    postId = response?.body?._id;
  });

  test("GET /posts - Get all posts", async () => {
    const response = await request(app)
      .get("/posts")
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toEqual(postsData.length);
  });

  test("GET /posts - Get posts by filter (type)", async () => {
    const responseOther = await request(app)
      .get(`/posts?type=${postsData[0].type}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(responseOther.statusCode).toBe(status.OK);
    expect(Array.isArray(responseOther.body)).toBeTruthy();
    expect(responseOther.body.length).toEqual(1);
    expect(responseOther.body[0].authorId).toBe(userData._id.toString());

    const responseDonation = await request(app)
      .get(`/posts?type=${postsData[1].type}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(responseDonation.statusCode).toBe(status.OK);
    expect(responseDonation.body.length).toEqual(2);
  });

  test("GET /posts/:id - Get post by ID", async () => {
    const response = await request(app)
      .get(`/posts/${postId}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(response.body.title).toBe(postsData[postsData.length - 1].title);
  });

  test("PUT /posts/:id - Update post", async () => {
    const updatedTitle = "Updated Title";
    const postPayload = {
      ...postsData[postsData.length - 1],
      authorId: userData._id,
      title: updatedTitle,
    };

    const response = await request(app)
      .put(`/posts/${postId}`)
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(postPayload);

    expect(response.statusCode).toBe(status.OK);
    expect(response.body.title).toBe(updatedTitle);
  });

  test("GET /posts/:id - fail to get post by non-existent ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/posts/${nonExistentId}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.NOT_FOUND);
  });

  test("POST /posts - fail to create post with invalid type (enum violation)", async () => {
    const invalidPost = {
      ...postsData[0],
      authorId: userData._id,
      type: "INVALID_TYPE_ENUM",
    };
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(invalidPost);

    expect(response.statusCode).toBe(status.BAD_REQUEST);
  });
});
