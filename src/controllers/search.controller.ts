import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { SearchService } from 'src/services/search.service';

@UseGuards(AuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query('q') q: string) {
    return this.searchService.searchAll(q);
  }
}
