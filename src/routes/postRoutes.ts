import express from "express";

import postController from "../controllers/postController";

const router = express.Router();

router.get("/", postController.get.bind(postController));

router.get("/:id", postController.getById.bind(postController));

router.post("/", postController.create.bind(postController));

router.put("/:id", postController.replace.bind(postController));

export default router;
