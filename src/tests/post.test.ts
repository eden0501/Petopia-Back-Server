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

  describe("POST /posts", () => {
    test("create a new post", async () => {
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

    test("fail to create an empty post", async () => {
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
    });

    test("fail to create post with non-existent author", async () => {
      const nonExistentAuthorId = new mongoose.Types.ObjectId();
      const invalidPost = {
        ...postsData[0],
        authorId: nonExistentAuthorId,
      };
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(invalidPost);

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to create post with invalid author format", async () => {
      const invalidPost = {
        ...postsData[0],
        authorId: userData._id + "invalid",
      };
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(invalidPost);

      expect(response.statusCode).toBe(status.BAD_REQUEST);
    });

    test("fail to create post with invalid type (enum violation)", async () => {
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

    test("fail to create post without authentication", async () => {
      const response = await request(app)
        .post("/posts")
        .send({
          ...postsData[0],
          authorId: userData._id,
        });

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to create post with missing required fields", async () => {
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({
          authorId: userData._id,
        });

      expect(response.statusCode).toBe(status.BAD_REQUEST);
    });
  });

  describe("GET /posts", () => {
    test("get all posts", async () => {
      const response = await request(app)
        .get("/posts")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toEqual(postsData.length);
    });

    test("get posts by filter (type)", async () => {
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

    test("fail to get posts without authentication", async () => {
      const response = await request(app).get("/posts");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /posts/:id", () => {
    test("get post by ID", async () => {
      const response = await request(app)
        .get(`/posts/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.title).toBe(postsData[postsData.length - 1].title);
    });

    test("fail to get post by non-existent id", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/posts/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });
  });

  describe("PUT /posts/:id", () => {
    test("update post", async () => {
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

    test("fail to update non-existent post", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/posts/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({
          ...postsData[0],
          authorId: userData._id,
        });

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("fail to update with empty body", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/posts/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
    });

    test("fail to update post without authentication", async () => {
      const response = await request(app)
        .put(`/posts/${postId}`)
        .send({
          ...postsData[0],
          authorId: userData._id,
          title: "Updated",
        });

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });
});
