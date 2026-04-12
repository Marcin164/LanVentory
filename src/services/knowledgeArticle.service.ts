import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { KnowledgeArticle } from 'src/entities/knowledgeArticle.entity';

@Injectable()
export class KnowledgeArticleService {
  constructor(
    @InjectRepository(KnowledgeArticle)
    private readonly repo: Repository<KnowledgeArticle>,
  ) {}

  async findBySpace(spaceId: string, category?: string) {
    return this.repo.find({
      where: { spaceId, ...(category ? { category } : {}) },
      relations: ['author'],
      order: { updatedAt: 'DESC' },
    });
  }

  async listCategoriesBySpace(
    spaceId: string,
  ): Promise<Array<{ category: string; count: number }>> {
    const rows = await this.repo
      .createQueryBuilder('article')
      .select('article.category', 'category')
      .addSelect('COUNT(*)::int', 'count')
      .where('article.spaceId = :spaceId', { spaceId })
      .andWhere('article.category IS NOT NULL')
      .andWhere("article.category <> ''")
      .groupBy('article.category')
      .orderBy('article.category', 'ASC')
      .getRawMany();
    return rows;
  }

  async findOne(id: string) {
    const article = await this.repo.findOne({
      where: { id },
      relations: ['author', 'space'],
    });
    if (!article) throw new NotFoundException('Article not found');

    // increment views
    await this.repo.increment({ id }, 'views', 1);

    return article;
  }

  async search(query: string) {
    return this.repo.find({
      where: [
        { title: ILike(`%${query}%`) },
        { content: ILike(`%${query}%`) },
      ],
      relations: ['author', 'space'],
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async create(dto: any, userId?: string) {
    const article = this.repo.create({
      ...dto,
      authorId: userId ?? dto.authorId,
    });
    return this.repo.save(article);
  }

  async update(id: string, dto: any) {
    const article = await this.repo.findOneBy({ id });
    if (!article) throw new NotFoundException('Article not found');
    Object.assign(article, dto);
    return this.repo.save(article);
  }

  async remove(id: string) {
    const article = await this.repo.findOneBy({ id });
    if (!article) throw new NotFoundException('Article not found');
    await this.repo.remove(article);
    return { deleted: true };
  }
}
