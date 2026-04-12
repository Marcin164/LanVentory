import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { KnowledgeSpaceService } from 'src/services/knowledgeSpace.service';

@UseGuards(AuthGuard)
@Controller('knowledge/spaces')
export class KnowledgeSpaceController {
  constructor(private readonly service: KnowledgeSpaceService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
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
