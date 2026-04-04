import status from "http-status";
import { isEmpty } from "lodash";
import { Model } from "mongoose";
import { CustomError } from "../utils/errorUtils";
import { AuthRequest } from "../types/authRequest";
import { NextFunction, Request, Response } from "express";

class BaseController<T> {
  model: Model<T>;

  constructor(dataModel: Model<T>) {
    this.model = dataModel;
  }

  async get({ query }: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.model.find(query || {});

      return res.json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getById({ params }: Request, res: Response, next: NextFunction) {
    try {
      if (!params?.id) {
        return next(
          new CustomError(status.BAD_REQUEST, "ID parameter is required"),
        );
      }

      const data = await this.model.findById(params.id);

      return !data
        ? next(new CustomError(status.NOT_FOUND, "Data not found"))
        : res.json(data);
    } catch (error) {
      return next(error);
    }
  }

  async create(
    { user, body, file }: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (isEmpty(body) || isEmpty(user)) {
        return next(
          new CustomError(status.BAD_REQUEST, "Request body is required"),
        );
      }

      const imageUrl = file ? `/uploads/${file.filename}` : undefined;

      const createdData = await this.model.create({
        ...body,
        ...(imageUrl && { imageUrl }),
        authorId: user.id,
      });

      return res.status(status.CREATED).json(createdData);
    } catch (error) {
      return next(error);
    }
  }

  async replace(
    { params, body, user, file }: AuthRequest,
    res: Response,
    next: NextFunction,
  ) {
    try {
      if (isEmpty(body) || isEmpty(user)) {
        return next(
          new CustomError(status.BAD_REQUEST, "Request body is required"),
        );
      }

      if (!params?.id) {
        return next(
          new CustomError(status.BAD_REQUEST, "ID parameter is required"),
        );
      }

      const imageUrl = file ? `/uploads/${file.filename}` : undefined;

      const updatedData = await this.model.findOneAndUpdate(
        { _id: params.id, authorId: user.id },
        { ...body, ...(imageUrl && { imageUrl }) },
        {
          new: true,
          runValidators: true,
        },
      );

      return !updatedData
        ? next(new CustomError(status.NOT_FOUND, "Data not found"))
        : res.json(updatedData);
    } catch (error) {
      return next(error);
    }
  }
}

export default BaseController;
