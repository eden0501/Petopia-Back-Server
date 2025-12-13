import { ParsedQs } from 'qs';
import status from 'http-status';
import { Request, Response } from 'express';

import { getErrorMessage } from '../utils';

class BaseController {
  model: any;
  mapQuery?: (query: ParsedQs) => Record<string, any>;

  constructor(
    dataModel: any,
    mapQueryToFilter?: (query: ParsedQs) => Record<string, any>
  ) {
    this.model = dataModel;
    this.mapQuery = mapQueryToFilter;
  }

  async get(req: Request, res: Response) {
    const filter = this.mapQuery ? this.mapQuery(req.query) : req.query;

    try {
      const data = await this.model.find(filter || {});

      res.json(data);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async getById(req: Request, res: Response) {
    const id = req.params.id;

    try {
      const data = await this.model.findById(id);

      if (!data) {
        return res.status(status.NOT_FOUND).json({ error: 'Data not found' });
      } else {
        res.json(data);
      }
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async post(req: Request, res: Response) {
    const obj = req.body;

    try {
      const createdData = await this.model.create(obj);

      res.status(status.CREATED).json(createdData);
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

      res.send(deletedData);
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }

  async put(req: Request, res: Response) {
    const id = req.params.id;
    const obj = req.body;

    try {
      const updatedData = await this.model.findByIdAndUpdate(id, obj, {
        new: true,
        runValidators: true,
      });

      if (!updatedData) {
        return res.status(status.NOT_FOUND).json({ error: 'Data not found' });
      } else {
        res.json(updatedData);
      }
    } catch (error) {
      res.status(status.INTERNAL_SERVER_ERROR).json({
        error: getErrorMessage(error),
      });
    }
  }
}

export default BaseController;
