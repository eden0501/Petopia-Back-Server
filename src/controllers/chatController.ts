import status from "http-status";
import { Types } from "mongoose";
import Post from "../models/postModel";
import User from "../models/userModel";
import Comment from "../models/commentModel";
import { PostTypes } from "../consts/postConsts";
import { NextFunction, Response } from "express";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";
import { getSystemInstruction } from "../utils/chatUtils";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface LeanPost {
  _id: Types.ObjectId;
  title: string;
  content: string;
  type: PostTypes;
  likes: Types.ObjectId[];
}

interface PopulatedPost extends LeanPost {
  authorId: { username: string } | null;
}

interface LeanComment {
  _id: Types.ObjectId;
  content: string;
}

class ChatController {
  async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { message, history } = req.body;
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
      const totalPosts = await Post.countDocuments({ authorId: userId });
      const userPosts = await Post.find({ authorId: userId })
        .sort({ createdAt: -1 })
        .limit(2)
        .lean<LeanPost[]>();
      const recentCommunityPosts = await Post.find({
        authorId: { $ne: userId },
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("authorId", "username")
        .lean<PopulatedPost[]>();

      let userContext = "[Petopia User Profile]\n";
      if (user) {
        userContext += "- Username: " + user.username + "\n";
        userContext += "- Pets: " + user.petsCount + "\n";
        userContext += "- Experience: " + (user.petOwnerSince ? "Since " + new Date(user.petOwnerSince).getFullYear() : "N/A") + "\n";
        userContext += "- Total Posts Created: " + totalPosts + "\n";
      }

      if (userPosts.length > 0) {
        userContext += "\n[Recent User Posts]\n";
        for (const p of userPosts) {
          const comments = await Comment.find({ postId: p._id })
            .sort({ createdAt: -1 })
            .limit(2)
            .lean<LeanComment[]>();
          userContext += "- " + p.title + " (" + p.type + ") | Likes: " + (p.likes?.length || 0) + "\n";
          if (comments.length > 0) {
            userContext += "  Comments on this post: " + comments.map((c: LeanComment) => "\"" + c.content + "\"").join(", ") + "\n";
          }
        }
      }

      userContext += "\n[Community Pulse (Excluding the user's posts)]\n";
      for (const p of recentCommunityPosts) {
        const comments = await Comment.find({ postId: p._id })
          .sort({ createdAt: -1 })
          .limit(2)
          .lean<LeanComment[]>();
        userContext += "- " + (p.authorId?.username || "Someone") + ": " + p.title + " | Likes: " + (p.likes?.length || 0) + "\n";
        if (comments.length > 0) {
          userContext += "  Top comments: " + comments.map((c: LeanComment) => "\"" + c.content + "\"").join(", ") + "\n";
        }
      }

      const systemInstruction = getSystemInstruction(userContext);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        systemInstruction,
      });

      if (history?.length > 0 && history[0].role === "model") {
        history.shift();
      }

      const chatSession = model.startChat({
        history: history || [],
      });
      const structuredPrompt = "USER QUERY: \"" + message + "\"\n\nPlease respond as PetBot using the context provided in your system instructions.";

      const result = await chatSession.sendMessage(structuredPrompt);
      const responseText = result.response.text();

      return res.json({ response: responseText });
    } catch (error) {
      return next(error);
    }
  }
}

export default new ChatController();
