import express from "express";

import commentController from "../controllers/commentController";

const router = express.Router();

router.get("/", commentController.get.bind(commentController));

router.get("/:id", commentController.getById.bind(commentController));

router.post("/", commentController.create.bind(commentController));

router.put("/:id", commentController.replace.bind(commentController));

router.delete("/:id", commentController.deleteById.bind(commentController));

export default router;
