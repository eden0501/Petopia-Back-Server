import status from "http-status";
import { Request, Response } from "express";

import { UNKNOWN_ERROR } from "../consts/consts";

class BaseController {
  model: any;

  constructor(dataModel: any) {
    this.model = dataModel;
  }

  async get(req: Request, res: Response) {
    const filter = req.query;

    try {
      const data = await this.model.find(filter || {});
      res.json(data);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : UNKNOWN_ERROR,
      });
    }
  }

  async getById(req: Request, res: Response) {
    const id = req.params.id;

    try {
      const data = await this.model.findById(id);
      if (!data) {
        return res.status(status.NOT_FOUND).json({ error: "Data not found" });
      } else {
        res.json(data);
      }
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : UNKNOWN_ERROR,
      });
    }
  }

  async post(req: Request, res: Response) {
    const obj = req.body;

    try {
      const response = await this.model.create(obj);
      res.status(status.CREATED).json(response);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : UNKNOWN_ERROR,
      });
    }
  }

  async deleteById(req: Request, res: Response) {
    const id = req.params.id;
    try {
      const response = await this.model.findByIdAndDelete(id);
      res.send(response);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : UNKNOWN_ERROR,
      });
    }
  }

  async put(req: Request, res: Response) {
    const id = req.params.id;
    const obj = req.body;

    try {
      const response = await this.model.findByIdAndUpdate(id, obj, {
        new: true,
      });
      res.json(response);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: error instanceof Error ? error.message : UNKNOWN_ERROR,
      });
    }
  }
}

export default BaseController;
