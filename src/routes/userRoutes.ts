import express from "express";
import userController from "../controllers/userController";

const router = express.Router();

router.get("/", userController.get.bind(userController));

router.get("/:id", userController.getById.bind(userController));

router.put("/:id", userController.replace.bind(userController));

export default router;
