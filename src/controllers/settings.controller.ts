import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { SettingsService } from 'src/services/settings.service';

@UseGuards(AuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getUsersSettings(@Request() req: any) {
    return this.settingsService.getUserSettings(req.user.id);
  }

  @Patch()
  updateUserSettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateUserSettings(
      req.user.properties.metadata.id,
      dto,
    );
  }
}
