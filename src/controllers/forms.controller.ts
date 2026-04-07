import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { FormsService } from 'src/services/forms.service';

@UseGuards(AuthGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get()
  async findAll(): Promise<any> {
    return this.formsService.findAll();
  }

  @Get('/user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.formsService.findByUser(userId);
  }

  @Get('/:id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const { form, stream } = await this.formsService.getFileStream(id);
    res.setHeader('Content-Type', form.mimetype || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(form.name)}"`,
    );
    stream.pipe(res);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: any,
    @Body('userId') userId: string,
  ) {
    return this.formsService.create(file, userId);
  }

  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return this.formsService.delete(id);
  }
}
