import { Router } from 'express';
import { LinkController } from '../controllers/LinkController';

const router = Router();
const linkController = new LinkController();

router.post('/', (req, res, next) => {
    linkController.create(req, res).catch(next);
});

router.get('/', (req, res, next) => {
    linkController.getAll(req, res).catch(next);
});

export default router;
