import { Request, Response } from 'express';
import { LinkService } from '../services/LinkService';

export class LinkController {
    private linkService: LinkService;

    constructor() {
        this.linkService = new LinkService();
    }

    async create(req: Request, res: Response) {
        try {
            const link = await this.linkService.create(req.body);
            return res.status(201).json(link);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }

    async getAll(req: Request, res: Response) {
        try {
            const links = await this.linkService.findAll();
            return res.json(links);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}
