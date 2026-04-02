import status from "http-status";
import Post from "../models/postModel";
import User from "../models/userModel";
import { NextFunction, Response } from "express";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";
import { GoogleGenerativeAI } from "@google/generative-ai";


class ChatController {
  async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;
      const userId = req.user?.id;

      if (!message) {
        return next(new CustomError(status.BAD_REQUEST, "Message is required"));
      }

      if (!userId) {
        return next(
          new CustomError(status.UNAUTHORIZED, "User not authenticated"),
        );
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return next(
          new CustomError(
            status.INTERNAL_SERVER_ERROR,
            "AI configuration error",
          ),
        );
      }

      const user = await User.findById(userId).lean();
      const userPosts = await Post.find({ authorId: userId }).limit(2).lean();
      const recentCommunityPosts = await Post.find()
        .sort({ createdAt: -1 })
        .limit(3)
        .populate<{ authorId: { username: string } }>("authorId", "username")
        .lean();

      let context =
        "You are PetBot, an AI assistant for Petopia - a social media app for pet owners.\n\n";
      context += "USER CONTEXT:\n";
      if (user) {
        context += `- Username: ${user.username}\n`;
        context += `- Pets: ${user.petsCount}\n`;
      }
      context += `- Posts created: ${await Post.countDocuments({ authorId: userId })}\n\n`;

      if (userPosts.length > 0) {
        context += "Recent user posts:\n";
        userPosts.forEach((post, idx) => {
          context += `${idx + 1}. [${post.type}] ${post.title}\n`;
        });
        context += "\n";
      }

      context += "Recent community activity:\n";
      recentCommunityPosts.forEach((post, idx) => {
        context += `${idx + 1}. ${post.authorId?.username || "Unknown"}: ${post.title}\n`;
      });

      context +=
        "\nProvide helpful, concise pet care advice (2-3 paragraphs). Be friendly and reference user context when relevant.\n\n";
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `${context}\nUSER: ${message}\n\nPetBot:`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      return res.json({ response: text });
    } catch (error) {
      return next(error);
    }
  }
}

export default new ChatController();
