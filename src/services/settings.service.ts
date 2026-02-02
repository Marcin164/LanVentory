import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSettings } from 'src/entities/userSettings.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private settingsRepository: Repository<UserSettings>,
  ) {}
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    return this.settingsRepository.findOneBy({ userId });
  }

  async updateUserSettings(
    userId: string,
    newSettings: Partial<UserSettings>,
  ): Promise<UserSettings> {
    await this.settingsRepository.update({ userId }, newSettings);
    return this.getUserSettings(userId) as Promise<UserSettings>;
  }
}
