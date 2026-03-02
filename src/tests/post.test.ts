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
          .send(post);

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
        .send({ ...postsData[0] });

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to create post with missing required fields", async () => {
      const response = await request(app)
        .post("/posts")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({});

      expect(response.statusCode).toBe(status.BAD_REQUEST);
    });
  });

  describe("GET /posts/batch", () => {
    test("returns batch payload with posts array", async () => {
      const response = await request(app)
        .get("/posts/batch")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body).toHaveProperty("posts");
      expect(Array.isArray(response.body.posts)).toBeTruthy();
    });

    test("respects page and limit params", async () => {
      const response = await request(app)
        .get("/posts/batch?page=1&limit=2")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.posts.length).toBeLessThanOrEqual(2);
      expect(Number(response.body.page)).toBe(1);
      expect(Number(response.body.limit)).toBe(2);
    });

    test("last page returns at most requested limit and no extra fields", async () => {
      const total = postsData.length;
      const response = await request(app)
        .get(`/posts/batch?page=${total}&limit=1`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.posts.length).toBeLessThanOrEqual(1);
      expect(response.body).not.toHaveProperty("hasMore");
      expect(response.body).not.toHaveProperty("total");
    });

    test("filters by type", async () => {
      const response = await request(app)
        .get(`/posts/batch?type=${postsData[1].type}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.posts.every((p: { type: string }) => p.type === postsData[1].type)).toBe(true);
    });

    test("returns empty data for out-of-range page", async () => {
      const response = await request(app)
        .get("/posts/batch?page=9999&limit=10")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.posts).toHaveLength(0);
    });

    test("fail to get batch without authentication", async () => {
      const response = await request(app).get("/posts/batch");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /posts", () => {
    test("get all posts", async () => {
      const response = await request(app)
        .get("/posts")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThanOrEqual(postsData.length);
    });

    test("get posts by filter (type)", async () => {
      const responseOther = await request(app)
        .get(`/posts?type=${postsData[0].type}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(responseOther.statusCode).toBe(status.OK);
      expect(Array.isArray(responseOther.body)).toBeTruthy();
      expect(responseOther.body.length).toBeGreaterThanOrEqual(1);
      expect(responseOther.body[0].authorId).toBe(userData._id.toString());

      const responseDonation = await request(app)
        .get(`/posts?type=${postsData[1].type}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(responseDonation.statusCode).toBe(status.OK);
      expect(responseDonation.body.length).toBeGreaterThanOrEqual(1);
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

  describe("POST /posts/like/:id", () => {
    test("like a post", async () => {
      const response = await request(app)
        .post(`/posts/like/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
    });

    test("like a post that is already liked (idempotent)", async () => {
      const response = await request(app)
        .post(`/posts/like/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);

      const postResponse = await request(app)
        .get(`/posts/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(postResponse.body.likes).toHaveLength(1);
    });

    test("fail to like a post without authentication", async () => {
      const response = await request(app).post(`/posts/like/${postId}`);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to like a non-existent post", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/posts/like/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });
  });

  describe("POST /posts/unlike/:id", () => {
    test("unlike a post", async () => {
      const response = await request(app)
        .post(`/posts/unlike/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
    });

    test("unlike a post that is already unliked (idempotent)", async () => {
      const response = await request(app)
        .post(`/posts/unlike/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);

      const postResponse = await request(app)
        .get(`/posts/${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(postResponse.body.likes).toHaveLength(0);
    });

    test("fail to unlike a post without authentication", async () => {
      const response = await request(app).post(`/posts/unlike/${postId}`);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });

    test("fail to unlike a non-existent post", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/posts/unlike/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });
  });
});
