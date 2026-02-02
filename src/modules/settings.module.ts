import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from 'src/controllers/settings.controller';
import { UserSettings } from 'src/entities/userSettings.entity';
import { SettingsService } from 'src/services/settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
