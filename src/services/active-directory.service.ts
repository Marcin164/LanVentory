import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import ActiveDirectory from 'activedirectory2';
import { AdminSettings } from 'src/entities/adminSettings.entity';
import { Repository } from 'typeorm';
import { uuidv4 } from 'src/helpers/uuidv4';
import { encrypt, decrypt } from 'src/helpers/crypto';
import * as fs from 'fs';
import * as path from 'path';

const CERT_DIR = path.join(process.cwd(), 'certs');
const CERT_PATH = path.join(CERT_DIR, 'ad-ca.cer');

export interface AdConfig {
  url: string;
  baseDN: string;
  username: string;
  password: string;
}

export interface AdStatus {
  connected: boolean;
  url: string | null;
  baseDN: string | null;
  lastSync: string | null;
  lastSyncUsersCount: number | null;
  hasCertificate: boolean;
}

@Injectable()
export class ActiveDirectoryService implements OnModuleInit {
  private ad: any = null;
  private connected = false;
  private readonly logger = new Logger(ActiveDirectoryService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(AdminSettings)
    private readonly adminSettingsRepository: Repository<AdminSettings>,
  ) {}

  async onModuleInit() {
    this.loadCertificate();

    const savedConfig = await this.getSavedConfig();

    if (savedConfig) {
      this.ad = this.createAdClient(savedConfig);
      this.connected = true;
      return;
    }

    const url = this.configService.get<string>('ad.url');
    const baseDN = this.configService.get<string>('ad.baseDN');
    const username = this.configService.get<string>('ad.username');
    const password = this.configService.get<string>('ad.password');

    if (url && baseDN && username && password) {
      const config: AdConfig = { url, baseDN, username, password };
      this.ad = this.createAdClient(config);
      this.connected = true;
      await this.saveConfig(config);
      this.logger.log('AD config from .env saved to database');
    }

    // Migrate old cert file if exists
    const oldCert = path.join(process.cwd(), 'corp-root-ca.cer');
    if (fs.existsSync(oldCert) && !fs.existsSync(CERT_PATH)) {
      if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
      fs.copyFileSync(oldCert, CERT_PATH);
      this.loadCertificate();
      this.logger.log('Migrated corp-root-ca.cer to certs/ad-ca.cer');
    }
  }

  private loadCertificate() {
    if (fs.existsSync(CERT_PATH)) {
      this.logger.log('AD CA certificate found');
    }
  }

  private normalizeBaseDN(baseDN: string): string {
    const trimmed = baseDN.trim();
    if (trimmed.toUpperCase().startsWith('DC=')) return trimmed;
    return trimmed
      .split('.')
      .map((part) => `DC=${part}`)
      .join(',');
  }

  private sanitizeConfig(config: AdConfig): AdConfig {
    return {
      url: config.url.trim(),
      baseDN: config.baseDN.trim(),
      username: config.username.trim(),
      password: config.password,
    };
  }

  private createAdClient(config: AdConfig) {
    const clean = this.sanitizeConfig(config);
    const opts: any = {
      url: clean.url,
      baseDN: this.normalizeBaseDN(clean.baseDN),
      username: clean.username,
      password: clean.password,
    };

    if (config.url.startsWith('ldaps')) {
      if (fs.existsSync(CERT_PATH)) {
        opts.tlsOptions = {
          ca: [fs.readFileSync(CERT_PATH)],
          rejectUnauthorized: false,
        };
      } else {
        opts.tlsOptions = {
          rejectUnauthorized: false,
        };
      }
    }

    return new ActiveDirectory(opts);
  }

  async getStatus(): Promise<AdStatus> {
    const savedConfig = await this.getSavedConfig();
    const syncInfo = await this.getSyncInfo();

    return {
      connected: this.connected,
      url: savedConfig?.url || this.configService.get<string>('ad.url') || null,
      baseDN:
        savedConfig?.baseDN ||
        this.configService.get<string>('ad.baseDN') ||
        null,
      lastSync: syncInfo?.lastSync || null,
      lastSyncUsersCount: syncInfo?.lastSyncUsersCount ?? null,
      hasCertificate: fs.existsSync(CERT_PATH),
    };
  }

  async connect(
    config: AdConfig,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const testAd = this.createAdClient(config);

      await new Promise<void>((resolve, reject) => {
        testAd.find(
          { filter: '(objectClass=user)' } as any,
          (err: any, result: any) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      this.ad = testAd;
      this.connected = true;
      await this.saveConfig(config);

      return { success: true, message: 'Połączono z Active Directory' };
    } catch (error: any) {
      this.logger.error(`AD connection failed: ${error}`);
      return {
        success: false,
        message: `Nie udało się połączyć: ${error.message || error}`,
      };
    }
  }

  async disconnect(
    password?: string,
  ): Promise<{ success: boolean; message: string }> {
    const savedConfig = await this.getSavedConfig();
    const currentPassword =
      savedConfig?.password || this.configService.get<string>('ad.password');

    if (!password || password !== currentPassword) {
      return { success: false, message: 'Nieprawidłowe hasło administratora' };
    }

    this.ad = null;
    this.connected = false;
    await this.deleteConfig();
    return { success: true, message: 'Rozłączono z Active Directory' };
  }

  async testConnection(
    config: AdConfig,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const testAd = this.createAdClient(config);

      await new Promise<void>((resolve, reject) => {
        testAd.find(
          { filter: '(objectClass=user)' } as any,
          (err: any, result: any) => {
            if (err) return reject(err);
            resolve();
          },
        );
      });

      return { success: true, message: 'Połączenie działa poprawnie' };
    } catch (error: any) {
      return {
        success: false,
        message: `Test nieudany: ${error.message || error}`,
      };
    }
  }

  async uploadCertificate(
    fileBuffer: Buffer,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
      fs.writeFileSync(CERT_PATH, fileBuffer);
      this.loadCertificate();
      return { success: true, message: 'Certyfikat zapisany' };
    } catch (error: any) {
      return {
        success: false,
        message: `Błąd zapisu certyfikatu: ${error.message}`,
      };
    }
  }

  async deleteCertificate(): Promise<{ success: boolean; message: string }> {
    if (fs.existsSync(CERT_PATH)) {
      fs.unlinkSync(CERT_PATH);
    }
    return { success: true, message: 'Certyfikat usunięty' };
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    if (!this.ad) throw new Error('Active Directory nie jest połączone');

    return new Promise((resolve, reject) => {
      this.ad.authenticate(username, password, (err: any, auth: boolean) => {
        if (err) {
          this.logger.error(`LDAP error: ${err}`);
          return reject(err);
        }
        resolve(auth);
      });
    });
  }

  async findAllUsers(): Promise<any[]> {
    if (!this.ad) throw new Error('Active Directory nie jest połączone');

    return new Promise((resolve, reject) => {
      const options = {
        filter: '(objectClass=user)',
        attributes: [
          'dn',
          'distinguishedName',
          'userPrincipalName',
          'sAMAccountName',
          'mail',
          'givenName',
          'sn',
          'displayName',
          'title',
          'department',
          'company',
          'streetAddress',
          'l',
          'st',
          'postalCode',
          'co',
          'office',
          'telephoneNumber',
          'mobile',
          'homePhone',
          'physicalDeliveryOfficeName',
          'manager',
          'memberOf',
          'whenCreated',
          'pwdLastSet',
          'userAccountControl',
        ],
      };

      this.ad.find(options, (err: any, result: any) => {
        if (err) {
          this.logger.error(`LDAP error: ${err}`);
          return reject(err);
        }

        if (!result || !result.users) {
          this.logger.warn('No users found in Active Directory');
          return resolve([]);
        }

        resolve(result.users);
      });
    });
  }

  async saveSyncInfo(usersCount: number): Promise<void> {
    const existing = await this.adminSettingsRepository.findOne({
      where: { key: 'ad_sync_info' },
    });

    const value = {
      lastSync: new Date().toISOString(),
      lastSyncUsersCount: usersCount,
    };

    if (existing) {
      existing.value = value;
      await this.adminSettingsRepository.save(existing);
    } else {
      await this.adminSettingsRepository.insert({
        id: uuidv4(),
        key: 'ad_sync_info',
        value: value as any,
      });
    }
  }

  private async getSyncInfo(): Promise<{
    lastSync: string;
    lastSyncUsersCount: number;
  } | null> {
    const record = await this.adminSettingsRepository.findOne({
      where: { key: 'ad_sync_info' },
    });
    return record?.value || null;
  }

  private async getSavedConfig(): Promise<AdConfig | null> {
    const record = await this.adminSettingsRepository.findOne({
      where: { key: 'ad_config' },
    });
    if (!record?.value) return null;

    const config = record.value as any;
    try {
      return {
        ...config,
        password: decrypt(config.password),
      };
    } catch {
      // Fallback for unencrypted legacy data
      return config;
    }
  }

  private async saveConfig(config: AdConfig): Promise<void> {
    const clean = this.sanitizeConfig(config);
    const toStore = {
      ...clean,
      password: encrypt(clean.password),
    };

    const existing = await this.adminSettingsRepository.findOne({
      where: { key: 'ad_config' },
    });

    if (existing) {
      existing.value = toStore;
      await this.adminSettingsRepository.save(existing);
    } else {
      await this.adminSettingsRepository.insert({
        id: uuidv4(),
        key: 'ad_config',
        value: toStore as any,
      });
    }
  }

  private async deleteConfig(): Promise<void> {
    await this.adminSettingsRepository.delete({ key: 'ad_config' });
  }
}
