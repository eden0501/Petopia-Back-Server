import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import Comment from "../models/commentModel";
import Post from "../models/postModel";
import User from "../models/userModel";
import {
  userData,
  postsData,
  commentsData,
  registerTestUser,
} from "../utils/testUtils";

let app: Express;
let postId: string;

beforeAll(async () => {
  app = await initApp();
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await User.deleteMany({});

  await registerTestUser(app);

  const post = await Post.create({
    ...postsData[0],
    authorId: userData._id,
  });
  postId = post._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Comment API", () => {
  let commentId: string;

  test("POST /comments - Create a new comment", async () => {
    let response;

    for (const comment of commentsData) {
      response = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({
          ...comment,
          postId: postId,
          authorId: userData._id,
        });

      expect(response.statusCode).toBe(status.CREATED);
      expect(response.body.content).toBe(comment.content);
    }

    commentId = response?.body?._id;
  });

  test("GET /comments - Get all comments", async () => {
    const response = await request(app)
      .get("/comments")
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toEqual(commentsData.length);
  });

  test("GET /comments - Get comments by filter (postId)", async () => {
    const response = await request(app)
      .get(`/comments?postId=${postId}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toEqual(commentsData.length);
    expect(response.body[0].postId).toBe(postId);
  });

  test("GET /comments/:id - Get comment by id", async () => {
    const response = await request(app)
      .get("/comments/" + commentId)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);
    expect(response.body.content).toBe(
      commentsData[commentsData.length - 1].content,
    );
  });

  test("PUT /comments/:id - Update comment", async () => {
    const updatedContent = "Updated Comment Content";
    const commentPayload = {
      ...commentsData[commentsData.length - 1],
      postId: postId,
      authorId: userData._id,
      content: updatedContent,
    };
    const response = await request(app)
      .put(`/comments/${commentId}`)
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(commentPayload);

    expect(response.statusCode).toBe(status.OK);
    expect(response.body.content).toBe(updatedContent);
  });

  test("DELETE /comments/:id - Delete comment", async () => {
    const response = await request(app)
      .delete(`/comments/${commentId}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.OK);

    const check = await Comment.findById(commentId);
    expect(check).toBeNull();
  });

  test("GET /comments/:id - Fail to get comment by non-existent ID", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get("/comments/" + nonExistentId)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.NOT_FOUND);
  });

  test("POST /comments - Fail to create comment with non-existent postId", async () => {
    const nonExistentPostId = new mongoose.Types.ObjectId();
    const invalidComment = {
      ...commentsData[0],
      postId: nonExistentPostId,
      authorId: userData._id,
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(invalidComment);

    expect(response.statusCode).toBe(status.BAD_REQUEST);
  });

  test("POST /comments - Fail to create comment with non-existent author", async () => {
    const nonExistentAuthorId = new mongoose.Types.ObjectId();
    const invalidComment = {
      ...commentsData[0],
      postId: postId,
      authorId: nonExistentAuthorId,
    };

    const response = await request(app)
      .post("/comments")
      .set("Authorization", "Bearer " + userData.accessToken)
      .send(invalidComment);

    expect(response.statusCode).toBe(status.BAD_REQUEST);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /comments - fail to create comment without authentication", async () => {
    const response = await request(app)
      .post("/comments")
      .send({
        ...commentsData[0],
        postId: postId,
        authorId: userData._id,
      });

    expect(response.statusCode).toBe(status.UNAUTHORIZED);
    expect(response.body).toHaveProperty("error");
  });

  test("POST /comments - fail to create comment with missing required fields", async () => {
    const response = await request(app)
      .post("/comments")
      .set("Authorization", "Bearer " + userData.accessToken)
      .send({
        authorId: userData._id,
      });

    expect(response.statusCode).toBe(status.BAD_REQUEST);
  });

  test("GET /comments - fail to get comments without authentication", async () => {
    const response = await request(app).get("/comments");

    expect(response.statusCode).toBe(status.UNAUTHORIZED);
    expect(response.body).toHaveProperty("error");
  });

  test("GET /comments/:id - fail to get comment without authentication", async () => {
    const newComment = await Comment.create({
      ...commentsData[0],
      postId: postId,
      authorId: userData._id,
    });

    const response = await request(app).get(`/comments/${newComment._id}`);

    expect(response.statusCode).toBe(status.UNAUTHORIZED);
    expect(response.body).toHaveProperty("error");
  });

  test("PUT /comments/:id - fail to update non-existent comment", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .put(`/comments/${nonExistentId}`)
      .set("Authorization", "Bearer " + userData.accessToken)
      .send({
        ...commentsData[0],
        postId: postId,
        authorId: userData._id,
      });

    expect(response.statusCode).toBe(status.NOT_FOUND);
  });

  test("PUT /comments/:id - fail to update comment without authentication", async () => {
    const newComment = await Comment.create({
      ...commentsData[0],
      postId: postId,
      authorId: userData._id,
    });

    const response = await request(app)
      .put(`/comments/${newComment._id}`)
      .send({
        ...commentsData[0],
        postId: postId,
        authorId: userData._id,
        content: "Updated",
      });

    expect(response.statusCode).toBe(status.UNAUTHORIZED);
    expect(response.body).toHaveProperty("error");
  });

  test("DELETE /comments/:id - fail to delete non-existent comment", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .delete(`/comments/${nonExistentId}`)
      .set("Authorization", "Bearer " + userData.accessToken);

    expect(response.statusCode).toBe(status.NOT_FOUND);
  });

  test("DELETE /comments/:id - fail to delete comment without authentication", async () => {
    const newComment = await Comment.create({
      ...commentsData[0],
      postId: postId,
      authorId: userData._id,
    });

    const response = await request(app).delete(`/comments/${newComment._id}`);

    expect(response.statusCode).toBe(status.UNAUTHORIZED);
    expect(response.body).toHaveProperty("error");
  });
});
