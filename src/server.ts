import cors from "cors";
import mongoose from "mongoose";
import express, { Express } from "express";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import commentRoutes from "./routes/commentRoutes";
import { swaggerUi, specs } from "./utils/swagger";
import authMiddleware from "./middlewares/authMiddleware";
import errorMiddleware from "./middlewares/errorMiddleware";

const app = express();

const initApp = () =>
  new Promise<Express>((resolve, reject) => {
    app.get("/", (_, res) => res.send("Health check"));

    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(cookieParser());
    app.use(cors({
      origin: JSON.parse(process.env.CORS_ALLOWED_ORIGINS || "[]"),
      credentials: true
    }));

    app.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customCss: ".swagger-ui .topbar { display: none }",
        customSiteTitle: "Petopia API Documentation",
      }),
    );

    app.get("/api-docs.json", (_, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(specs);
    });

    app.use("/auth", authRoutes);

    app.use(authMiddleware);

    app.use("/users", userRoutes);
    app.use("/posts", postRoutes);
    app.use("/comments", commentRoutes);
    app.use(errorMiddleware);

    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl) {
      mongoose.connect(dbUrl).then(() => {
        resolve(app);
      });

      const db = mongoose.connection;
      db.on("error", (error) => console.error(error));
      db.once("open", () => console.log("Connected to Database"));
    } else {
      reject("DATABASE_URL is not defined");
    }
  });

export default initApp;
