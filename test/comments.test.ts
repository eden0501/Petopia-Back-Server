import request from "supertest";
import initApp from "../src/server";
import Comment from "../src/models/commentModel";
import Post from "../src/models/postModel";
import { Express } from "express";
import { getLoggedInUser, UserData, commentsList } from "./utils";
import mongoose from "mongoose";

let app: Express;
let loginUser: UserData;
let commentId = "";
let postId = "";

beforeAll(async () => {
  app = await initApp();
  await Comment.deleteMany();
  await Post.deleteMany();
  loginUser = await getLoggedInUser(app);

  // Create a post for comments
  const postResponse = await request(app)
    .post("/posts")
    .set("Authorization", "Bearer " + loginUser.accessToken)
    .send({ title: "Test Post", content: "For comments", type: "Report", authorId: loginUser._id });
  postId = postResponse.body._id;

  // Update commentsList with postId
  commentsList.forEach((comment) => {
    comment.postId = postId;
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Comment Tests", () => {
  test("Initial empty comments", async () => {
    const response = await request(app)
      .get("/comments")
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test("Create Comment", async () => {
    for (const comment of commentsList) {
      const response = await request(app)
        .post("/comments")
        .set("Authorization", "Bearer " + loginUser.accessToken)
        .send({ ...comment, authorId: loginUser._id });

      expect(response.status).toBe(201);
      expect(response.body.content).toBe(comment.content);
      expect(response.body.postId).toBe(comment.postId);
    }
  });

  test("Get All Comments", async () => {
    const response = await request(app)
      .get("/comments")
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(commentsList.length);
  });

  test("Get Comments by postId", async () => {
    const response = await request(app)
      .get("/comments?postId=" + postId)
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(commentsList.length);
    expect(response.body[0].content).toBe(commentsList[0].content);
    commentId = response.body[0]._id;
  });

  test("Get Comment by ID", async () => {
    const response = await request(app)
      .get("/comments/" + commentId)
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(response.status).toBe(200);
    expect(response.body.content).toBe(commentsList[0].content);
    expect(response.body.postId).toBe(postId);
    expect(response.body._id).toBe(commentId);
  });

  test("Update Comment", async () => {
    const response = await request(app)
      .put("/comments/" + commentId)
      .set("Authorization", "Bearer " + loginUser.accessToken)
      .send({ 
        ...commentsList[0], 
        content: "Updated comment text",
        postId: postId,
        authorId: loginUser._id 
      });

    expect(response.status).toBe(200);
    expect(response.body.content).toBe("Updated comment text");
  });

  test("Delete Comment", async () => {
    const response = await request(app)
      .delete("/comments/" + commentId)
      .set("Authorization", "Bearer " + loginUser.accessToken);

    expect(response.status).toBe(200);

    const getResponse = await request(app)
      .get("/comments/" + commentId)
      .set("Authorization", "Bearer " + loginUser.accessToken);
    expect(getResponse.status).toBe(404);
  });
});
