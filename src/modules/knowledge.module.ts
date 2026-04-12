import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeSpace } from 'src/entities/knowledgeSpace.entity';
import { KnowledgeArticle } from 'src/entities/knowledgeArticle.entity';
import { KnowledgeSpaceService } from 'src/services/knowledgeSpace.service';
import { KnowledgeArticleService } from 'src/services/knowledgeArticle.service';
import { KnowledgeSpaceController } from 'src/controllers/knowledgeSpace.controller';
import { KnowledgeArticleController } from 'src/controllers/knowledgeArticle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeSpace, KnowledgeArticle])],
  controllers: [KnowledgeSpaceController, KnowledgeArticleController],
  providers: [KnowledgeSpaceService, KnowledgeArticleService],
  exports: [KnowledgeArticleService],
})
export class KnowledgeModule {}
