import express from 'express';

import postController from '../controllers/postContoller';

const router = express.Router();

router.get('/', postController.get.bind(postController));

router.get('/:id', postController.getById.bind(postController));

router.post('/', postController.post.bind(postController));

router.put('/:id', postController.put.bind(postController));

export default router;