import { ParsedQs } from "qs";
import { Model } from "mongoose";
import status from "http-status";
import { Request, Response } from "express";

import { getErrorMessage } from "../utils";

class BaseController<T> {
  model: Model<T>;
  mapQuery?: (query: ParsedQs) => Record<string, any>;

  constructor(
    dataModel: Model<T>,
    mapQueryToFilter?: (query: ParsedQs) => Record<string, any>
  ) {
    this.model = dataModel;
    this.mapQuery = mapQueryToFilter;
  }

  async get(req: Request, res: Response) {
    const filter = this.mapQuery ? this.mapQuery(req.query) : req.query;

    try {
      const data = await this.model.find(filter || {});

      return res.json(data);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async getById({ params }: Request, res: Response) {
    try {
      const data = await this.model.findById(params?.id);

      return !data
        ? res.status(status.NOT_FOUND).json({ error: "Data not found" })
        : res.json(data);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async create({ body }: Request, res: Response) {
    try {
      const createdData = await this.model.create(body);

      return res.status(status.CREATED).json(createdData);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async deleteById(req: Request, res: Response) {
    const id = req.params.id;

    try {
      const deletedData = await this.model.findByIdAndDelete(id);

      return res.send(deletedData);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async update(req: Request, res: Response) {
    const id = req.params.id;
    const obj = req.body;

    try {
      const updatedData = await this.model.findByIdAndUpdate(id, obj, {
        new: true,
        runValidators: true,
      });

      return !updatedData
        ? res.status(status.NOT_FOUND).json({ error: "Data not found" })
        : res.json(updatedData);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }
}

export default BaseController;
