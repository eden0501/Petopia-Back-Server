import { Express } from "express";
import User from "../models/userModel";
import { PostInterface } from "../types/postInterfaces";
import { CommentInterface } from "../types/commentInterfaces";
import { UserInterface } from "../types/userInterfaces";
import { PostTypes } from "../consts/postConsts";
import mongoose from "mongoose";

export const userData = {
    username: "testUser",
    password: "password123",
    dateOfBirth: new Date("1990-01-01"),
    petsCount: 1,
} as unknown as UserInterface;

export const singlePostData = {
    title: "Test Post",
    content: "This is a test post content",
    type: PostTypes.OTHER, 
} as unknown as PostInterface;

export const commentsData = [
    {
        content: "Test Comment 1",
    },
    {
        content: "Test Comment 2",
    }
] as unknown as CommentInterface[];

export const registerTestUser = async (app: Express) => {
    // Ensure clean state handled by tests usually, but here we can create the user
    await User.deleteMany({ username: userData.username });
    const user = await User.create(userData);
    userData._id = user._id;
    // Since there is no auth/token, we just stick to ID
};