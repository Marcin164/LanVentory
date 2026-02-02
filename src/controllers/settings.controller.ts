import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/guards/authGuard.guard';
import { SettingsService } from 'src/services/settings.service';

@UseGuards(AuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getUsersSettings() {
    return this.settingsService.getUserSettings();
  }

  @Patch(':userId')
  updateUserSettings(@Param('userId') userId: string, @Body() dto: any) {
    return this.settingsService.updateUserSettings(userId, dto);
  }
}
