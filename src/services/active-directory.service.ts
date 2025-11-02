import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import ActiveDirectory from 'activedirectory2';
import { Users } from 'src/entities/users.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ActiveDirectoryService {
  private ad: any;
  private readonly logger = new Logger(ActiveDirectoryService.name);

  constructor(private configService: ConfigService) {
    this.ad = new ActiveDirectory({
      url: this.configService.get<any>('ad.url'),
      baseDN: this.configService.get<any>('ad.baseDN'),
      username: this.configService.get<any>('ad.username'),
      password: this.configService.get<any>('ad.password'),
    } as any);
  }

  async authenticate(username: string, password: string): Promise<boolean> {
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
}
