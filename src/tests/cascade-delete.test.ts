import request from "supertest";
import initApp from "../server";
import status from "http-status";
import { Express } from "express";
import mongoose from "mongoose";
import Post from "../models/postModel";
import User from "../models/userModel";
import Comment from "../models/commentModel";
import { PostTypes } from "../consts/postConsts";

let app: Express;

const testUser1 = {
  username: "cascadeUser1",
  email: "cascade1@test.com",
  password: "password123",
  accessToken: "",
  _id: null as mongoose.Types.ObjectId | null,
};

const testUser2 = {
  username: "cascadeUser2",
  email: "cascade2@test.com",
  password: "password123",
  accessToken: "",
  _id: null as mongoose.Types.ObjectId | null,
};

beforeAll(async () => {
  app = await initApp();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Cascade Delete Tests", () => {
  beforeEach(async () => {
    await Comment.deleteMany({});
    await Post.deleteMany({});
    await User.deleteMany({});

    const response1 = await request(app).post("/auth/register").send({
      username: testUser1.username,
      email: testUser1.email,
      password: testUser1.password,
    });
    const cookies1 = response1.header["set-cookie"] as unknown as
      | string[]
      | undefined;
    if (cookies1) {
      const accessTokenCookie = cookies1.find((c: string) =>
        c.startsWith("accessToken="),
      );
      if (accessTokenCookie) {
        testUser1.accessToken = accessTokenCookie.split(";")[0].split("=")[1];
      }
    }
    const user1 = await User.findOne({ email: testUser1.email });
    testUser1._id = user1?._id || null;

    const response2 = await request(app).post("/auth/register").send({
      username: testUser2.username,
      email: testUser2.email,
      password: testUser2.password,
    });
    const cookies2 = response2.header["set-cookie"] as unknown as
      | string[]
      | undefined;
    if (cookies2) {
      const accessTokenCookie = cookies2.find((c: string) =>
        c.startsWith("accessToken="),
      );
      if (accessTokenCookie) {
        testUser2.accessToken = accessTokenCookie.split(";")[0].split("=")[1];
      }
    }
    const user2 = await User.findOne({ email: testUser2.email });
    testUser2._id = user2?._id || null;
  });

  describe("DELETE /posts/:id - Cascade delete comments", () => {
    test("should delete post and all its comments", async () => {
      const postResponse = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({
          title: "Test Post for Cascade",
          content: "This post will be deleted",
          type: PostTypes.OTHER,
        });

      const postId = postResponse.body._id;

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({ content: "Comment 1", postId });

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${testUser2.accessToken}`])
        .send({ content: "Comment 2", postId });

      const commentsBefore = await Comment.find({ postId });
      expect(commentsBefore.length).toBe(2);

      const deleteResponse = await request(app)
        .delete(`/posts/${postId}`)
        .set("Cookie", [`accessToken=${testUser1.accessToken}`]);

      expect(deleteResponse.statusCode).toBe(status.OK);

      const postAfter = await Post.findById(postId);
      expect(postAfter).toBeNull();

      const commentsAfter = await Comment.find({ postId });
      expect(commentsAfter.length).toBe(0);
    });

    test("should not delete post if user is not the author", async () => {
      const postResponse = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({
          title: "User1 Post",
          content: "This is user1's post",
          type: PostTypes.OTHER,
        });

      const postId = postResponse.body._id;

      const deleteResponse = await request(app)
        .delete(`/posts/${postId}`)
        .set("Cookie", [`accessToken=${testUser2.accessToken}`]);

      expect(deleteResponse.statusCode).toBe(status.FORBIDDEN);

      const postAfter = await Post.findById(postId);
      expect(postAfter).not.toBeNull();
    });

    test("should fail to delete non-existent post", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/posts/${nonExistentId}`)
        .set("Cookie", [`accessToken=${testUser1.accessToken}`]);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("should fail to delete post without authentication", async () => {
      const postResponse = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({
          title: "Test Post",
          content: "Content",
          type: PostTypes.OTHER,
        });

      const response = await request(app).delete(
        `/posts/${postResponse.body._id}`,
      );

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
    });
  });

  describe("DELETE /users - Delete self with cascade", () => {
    test("should delete user and all their posts and comments", async () => {
      const post1Response = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({
          title: "User1 Post 1",
          content: "Content 1",
          type: PostTypes.OTHER,
        });

      const post2Response = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({
          title: "User1 Post 2",
          content: "Content 2",
          type: PostTypes.DONATION,
        });

      const post1Id = post1Response.body._id;
      const post2Id = post2Response.body._id;

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({ content: "User1 comment on post1", postId: post1Id });

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${testUser2.accessToken}`])
        .send({ content: "User2 comment on user1 post", postId: post1Id });

      const user2PostResponse = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser2.accessToken}`])
        .send({
          title: "User2 Post",
          content: "User2 Content",
          type: PostTypes.OTHER,
        });

      const user2PostId = user2PostResponse.body._id;

      await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({ content: "User1 comment on user2 post", postId: user2PostId });

      const user1PostsBefore = await Post.find({ authorId: testUser1._id });
      expect(user1PostsBefore.length).toBe(2);

      const user1CommentsBefore = await Comment.find({
        authorId: testUser1._id,
      });
      expect(user1CommentsBefore.length).toBe(2);

      const deleteResponse = await request(app)
        .delete("/users")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`]);

      expect(deleteResponse.statusCode).toBe(status.OK);

      const user1After = await User.findById(testUser1._id);
      expect(user1After).toBeNull();

      const user1PostsAfter = await Post.find({ authorId: testUser1._id });
      expect(user1PostsAfter.length).toBe(0);

      const user1CommentsAfter = await Comment.find({
        authorId: testUser1._id,
      });
      expect(user1CommentsAfter.length).toBe(0);

      const commentsOnUser1Posts = await Comment.find({
        postId: { $in: [post1Id, post2Id] },
      });
      expect(commentsOnUser1Posts.length).toBe(0);

      const user2PostAfter = await Post.findById(user2PostId);
      expect(user2PostAfter).not.toBeNull();

      const user2After = await User.findById(testUser2._id);
      expect(user2After).not.toBeNull();
    });

    test("should fail to delete user without authentication", async () => {
      const response = await request(app).delete("/users");

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
    });

    test("should fail with invalid token", async () => {
      const response = await request(app)
        .delete("/users")
        .set("Cookie", ["accessToken=invalid-token"]);

      expect(response.statusCode).toBe(status.INTERNAL_SERVER_ERROR);
    });
  });

  describe("DELETE /comments/:id - Authorization tests", () => {
    let postId: string;
    let commentId: string;

    beforeEach(async () => {
      const postResponse = await request(app)
        .post("/posts")
        .set("Cookie", [`accessToken=${testUser1.accessToken}`])
        .send({
          title: "Post for comment tests",
          content: "Content",
          type: PostTypes.OTHER,
        });

      postId = postResponse.body._id;

      const commentResponse = await request(app)
        .post("/comments")
        .set("Cookie", [`accessToken=${testUser2.accessToken}`])
        .send({ content: "User2 comment", postId });

      commentId = commentResponse.body._id;
    });

    test("comment author can delete their own comment", async () => {
      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set("Cookie", [`accessToken=${testUser2.accessToken}`]);

      expect(response.statusCode).toBe(status.OK);

      const commentAfter = await Comment.findById(commentId);
      expect(commentAfter).toBeNull();
    });

    test("post owner can delete comments on their post", async () => {
      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set("Cookie", [`accessToken=${testUser1.accessToken}`]);

      expect(response.statusCode).toBe(status.OK);

      const commentAfter = await Comment.findById(commentId);
      expect(commentAfter).toBeNull();
    });

    test("other users cannot delete comments they don't own on posts they don't own", async () => {
      const testUser3 = {
        username: "cascadeUser3",
        email: "cascade3@test.com",
        password: "password123",
      };

      const response3 = await request(app)
        .post("/auth/register")
        .send(testUser3);
      const cookies3 = response3.header["set-cookie"] as unknown as
        | string[]
        | undefined;
      let user3Token = "";
      if (cookies3) {
        const accessTokenCookie = cookies3.find((c: string) =>
          c.startsWith("accessToken="),
        );
        if (accessTokenCookie) {
          user3Token = accessTokenCookie.split(";")[0].split("=")[1];
        }
      }

      const response = await request(app)
        .delete(`/comments/${commentId}`)
        .set("Cookie", [`accessToken=${user3Token}`]);

      expect(response.statusCode).toBe(status.FORBIDDEN);

      const commentAfter = await Comment.findById(commentId);
      expect(commentAfter).not.toBeNull();
    });

    test("should fail to delete non-existent comment", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/comments/${nonExistentId}`)
        .set("Cookie", [`accessToken=${testUser1.accessToken}`]);

      expect(response.statusCode).toBe(status.NOT_FOUND);
    });

    test("should fail to delete comment without authentication", async () => {
      const response = await request(app).delete(`/comments/${commentId}`);

      expect(response.statusCode).toBe(status.UNAUTHORIZED);
    });
  });
});
