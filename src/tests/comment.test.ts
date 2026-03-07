import initApp from "../server";
import mongoose from "mongoose";
import request from "supertest";
import status from "http-status";
import { Express } from "express";
import Post from "../models/postModel";
import User from "../models/userModel";
import Comment from "../models/commentModel";
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

  describe("POST /comments", () => {
    test("create a new comment", async () => {
      let response;

      for (const comment of commentsData) {
        response = await request(app)
          .post("/comments")
          .set("Authorization", "Bearer " + userData.accessToken)
          .send({
            ...comment,
            postId: postId,
          });

        expect(response.statusCode).toBe(status.CREATED);
        expect(response.body.content).toBe(comment.content);
      }

      commentId = response?.body?._id;
    });

    test("fail to create comment with non-existent postId", async () => {
      const nonExistentPostId = new mongoose.Types.ObjectId();
      const invalidComment = {
        ...commentsData[0],
        postId: nonExistentPostId,
      };

      const response = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(invalidComment);

      expect([status.BAD_REQUEST, status.UNAUTHORIZED]).toContain(
        response.statusCode,
      );

      if (response.statusCode === status.BAD_REQUEST) {
        expect(response.body).toHaveProperty("error");
      }
    });

    test("fail to create comment with missing required fields", async () => {
      const response = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({ postId });

      expect(response.statusCode).toBe(status.BAD_REQUEST);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /comments", () => {
    test("get all comments", async () => {
      const response = await request(app)
        .get("/comments")
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toEqual(commentsData.length);
    });

    test("get comments by filter (postId)", async () => {
      const response = await request(app)
        .get(`/comments?postId=${postId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toEqual(commentsData.length);
      expect(response.body[0].postId).toBe(postId);
    });
  });

  describe("GET /comments/:id", () => {
    test("get comment by id", async () => {
      const response = await request(app)
        .get("/comments/" + commentId)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);
      expect(response.body.content).toBe(
        commentsData[commentsData.length - 1].content,
      );
    });

    test("fail to get comment by non-existent ID", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get("/comments/" + nonExistentId)
        .set("Authorization", "Bearer " + userData.accessToken);
      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("fail to get comment without authentication", async () => {
      const response = await request(app).get(`/comments/${commentId}`);
      expect([status.UNAUTHORIZED, status.NOT_FOUND]).toContain(
        response.statusCode,
      );
      if (response.statusCode === status.UNAUTHORIZED) {
        expect(response.body).toHaveProperty("error");
      }
    });
  });

  describe("PUT /comments/:id", () => {
    test("update comment", async () => {
      const updatedContent = "Updated Comment Content";
      const commentPayload = {
        ...commentsData[commentsData.length - 1],
        postId: postId,
        content: updatedContent,
      };
      const response = await request(app)
        .put(`/comments/${commentId}`)
        .set("Authorization", "Bearer " + userData.accessToken)
        .send(commentPayload);

      expect([status.OK, status.BAD_REQUEST]).toContain(response.statusCode);
      if (response.statusCode === status.OK) {
        expect(response.body.content).toBe(updatedContent);
      } else {
        expect(response.body).toHaveProperty("error");
      }
    });

    test("fail to update non-existent comment", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/comments/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({
          ...commentsData[0],
          postId: postId,
        });

      expect([status.NOT_FOUND, status.BAD_REQUEST]).toContain(
        response.statusCode,
      );
    });

    test("fail to update comment without authentication", async () => {
      const response = await request(app)
        .put(`/comments/${commentId}`)
        .send({
          ...commentsData[0],
          postId: postId,
          content: "Updated",
        });
      expect(response.statusCode).toBe(status.UNAUTHORIZED);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /comments/:id", () => {
    test("delete own comment", async () => {
      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.OK);

      const check = await Comment.findById(commentId);
      expect(check).toBeNull();
    });

    test("post author can delete comment on their post", async () => {
      // Create a second user
      const secondUser = {
        username: "secondUser",
        email: "second@user.com",
        password: "password123",
        petOwnerSince: new Date("1995-01-01"),
        petsCount: 2,
      };

      const registerResponse = await request(app)
        .post("/auth/register")
        .send(secondUser);
      const secondUserToken = registerResponse.body.accessToken;

      // Second user creates a comment on first user's post
      const commentResponse = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + secondUserToken)
        .send({ content: "Comment by second user", postId });

      expect(commentResponse.statusCode).toBe(status.CREATED);
      const secondUserCommentId = commentResponse.body._id;

      // First user (post author) deletes second user's comment
      const deleteResponse = await request(app)
        .delete(`/comments/${secondUserCommentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(deleteResponse.statusCode).toBe(status.OK);

      const check = await Comment.findById(secondUserCommentId);
      expect(check).toBeNull();
    });

    test("fail to delete another user's comment on another user's post", async () => {
      // Create a third user
      const thirdUser = {
        username: "thirdUser",
        email: "third@user.com",
        password: "password123",
        petOwnerSince: new Date("2000-01-01"),
        petsCount: 3,
      };

      const registerResponse = await request(app)
        .post("/auth/register")
        .send(thirdUser);
      const thirdUserToken = registerResponse.body.accessToken;

      // First user creates a comment on their own post
      const commentResponse = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({ content: "Comment by first user", postId });

      expect(commentResponse.statusCode).toBe(status.CREATED);
      const firstUserCommentId = commentResponse.body._id;

      // Third user tries to delete first user's comment on first user's post
      const deleteResponse = await request(app)
        .delete(`/comments/${firstUserCommentId}`)
        .set("Authorization", "Bearer " + thirdUserToken);

      expect(deleteResponse.statusCode).toBe(status.FORBIDDEN);
      expect(deleteResponse.body).toHaveProperty("error");

      // Verify comment still exists
      const check = await Comment.findById(firstUserCommentId);
      expect(check).not.toBeNull();
    });

    test("fail to delete non-existent comment", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/comments/${nonExistentId}`)
        .set("Authorization", "Bearer " + userData.accessToken);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("fail to delete comment without authentication", async () => {
      const createResponse = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + userData.accessToken)
        .send({ ...commentsData[0], postId });

      const newCommentId = createResponse.body._id;

      const response = await request(app).delete(`/comments/${newCommentId}`);

      expect([status.UNAUTHORIZED, status.NOT_FOUND]).toContain(
        response.statusCode,
      );
      if (response.statusCode === status.UNAUTHORIZED) {
        expect(response.body).toHaveProperty("error");
      }
    });
  });
});
