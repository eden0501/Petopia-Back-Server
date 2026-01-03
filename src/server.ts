import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express, { Express } from 'express';

import postRoutes from './routes/postRoutes';
import errorMiddleware from './middlewares/errorMiddleware';

dotenv.config();
const app = express();

const initApp = () =>
  new Promise<Express>((resolve, reject) => {
    app.get('/', (_, res) => res.send('Health check'));

    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());

    app.use('/posts', postRoutes);
    app.use(errorMiddleware);
    
    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl) {
      mongoose.connect(dbUrl).then(() => {
        resolve(app);
      });

      const db = mongoose.connection;
      db.on('error', (error) => console.error(error));
      db.once('open', () => console.log('Connected to Database'));
    } else {
      reject('DATABASE_URL is not defined');
    }
  });

export default initApp;
