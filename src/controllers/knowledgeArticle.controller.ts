import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { KnowledgeArticleService } from 'src/services/knowledgeArticle.service';

@UseGuards(AuthGuard)
@Controller('knowledge/articles')
export class KnowledgeArticleController {
  constructor(private readonly service: KnowledgeArticleService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    return this.service.search(query || '');
  }

  @Get('space/:spaceId')
  async findBySpace(
    @Param('spaceId') spaceId: string,
    @Query('category') category?: string,
  ) {
    return this.service.findBySpace(spaceId, category || undefined);
  }

  @Get('space/:spaceId/categories')
  async listCategories(@Param('spaceId') spaceId: string) {
    return this.service.listCategoriesBySpace(spaceId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: any, @Req() req: any) {
    const userId = req?.user?.properties?.metadata?.id;
    return this.service.create(dto, userId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
