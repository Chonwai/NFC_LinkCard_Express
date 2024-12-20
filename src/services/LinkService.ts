import { AppDataSource } from '../config/data-source';
import { Link } from '../models/Link';

export class LinkService {
    private linkRepository = AppDataSource.getRepository(Link);

    async create(data: Partial<Link>) {
        const link = this.linkRepository.create(data);
        return await this.linkRepository.save(link);
    }

    async findAll() {
        return await this.linkRepository.find();
    }
}
