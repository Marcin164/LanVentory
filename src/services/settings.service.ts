import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSettings } from 'src/entities/userSettings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    return this.settingsRepository.findOne({
      where: { userId },
    });
  }

  async updateUserSettings(
    userId: string,
    newSettings: Partial<UserSettings>,
  ): Promise<UserSettings> {
    let settings = await this.getUserSettings(userId);

    if (!settings) {
      // jeśli brak rekordu → tworzymy nowy
      settings = this.settingsRepository.create({
        userId,
        ...newSettings,
      });
    } else {
      // merge = aktualizacja tylko przekazanych pól
      this.settingsRepository.merge(settings, newSettings);
    }

    return this.settingsRepository.save(settings);
  }
}
