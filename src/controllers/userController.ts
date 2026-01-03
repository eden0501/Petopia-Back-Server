import User from "../models/userModel";
import BaseController from "./baseController";
import { UserInterface } from "../types/userInterfaces";

const userController = new BaseController<UserInterface>(User);

export default userController;
