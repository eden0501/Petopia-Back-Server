import { ParsedQs } from "qs";
import { isEmpty } from "lodash";
import { Model } from "mongoose";
import status from "http-status";
import { NextFunction, Request, Response } from "express";

import { CustomError } from "../utils/errorUtils";

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
          new CustomError(status.BAD_REQUEST, "ID parameter is required")
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

  async create({ body }: Request, res: Response, next: NextFunction) {
    try {
      if (isEmpty(body)) {
        return next(
          new CustomError(status.BAD_REQUEST, "Request body is required")
        );
      }

      const createdData = await this.model.create(body);

      return res.status(status.CREATED).json(createdData);
    } catch (error) {
      return next(error);
    }
  }

  async deleteById({ params }: Request, res: Response, next: NextFunction) {
    try {
      if (!params?.id) {
        return next(
          new CustomError(status.BAD_REQUEST, "ID parameter is required")
        );
      }

      const deletedData = await this.model.findByIdAndDelete(params.id);

      return !deletedData
        ? next(new CustomError(status.NOT_FOUND, "Data not found"))
        : res.status(status.OK).send("Successfully deleted");
    } catch (error) {
      return next(error);
    }
  }

  async replace({ params, body }: Request, res: Response, next: NextFunction) {
    try {
      if (isEmpty(body)) {
        return next(
          new CustomError(status.BAD_REQUEST, "Request body is required")
        );
      }

      if (!params?.id) {
        return next(
          new CustomError(status.BAD_REQUEST, "ID parameter is required")
        );
      }

      const updatedData = await this.model.findOneAndReplace(
        { _id: params.id },
        body,
        {
          new: true,
          runValidators: true,
        }
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
