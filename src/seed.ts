import { DataSource } from 'typeorm';
import { Users } from './entities/users.entity';
import { Devices } from './entities/devices.entity';
import { Applications } from './entities/applications.entity';
import { DevicesApplications } from './entities/devicesApplications.entity';
import { Flows } from './entities/flows.entity';
import { Forms } from './entities/forms.entity';
import { Histories } from './entities/histories.entity';

import * as fs from 'fs';
import * as path from 'path';
import { HistoryApprovers } from './entities/historyApprovers.entity';
import { HistoryDevices } from './entities/historyDevices.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'Root',
  password: '12345678',
  database: 'AssetManager',
  schema: 'public',
  entities: [
    Users,
    Devices,
    Flows,
    Forms,
    Histories,
    HistoryApprovers,
    HistoryDevices,
    Applications,
    DevicesApplications,
  ],
  synchronize: true, // tylko w dev/test
});

async function seed() {
  await dataSource.initialize();

  // ============================================
  // 1️⃣ Użytkownicy
  // ============================================
  const users = await dataSource.getRepository(Users).save([
    {
      name: 'Jan',
      surname: 'Kowalski',
      email: 'jan.kowalski@example.com',
      username: 'jank',
      phone: '+48 600 100 200',
      displayName: 'Jan Kowalski',
      mailNickname: 'jank',
      userPrincipalName: 'jank@example.com',
      samAccountName: 'jank',
      title: 'Administrator',
      department: 'IT',
      company: 'TechCorp',
      office: 'Warsaw HQ',
      physicalDeliveryOfficeName: 'Warsaw HQ',
      streetAddress: 'ul. Przykładowa 1',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'Polska',
      manager: 'manager1',
      distinguishedName: 'CN=Jan Kowalski,OU=Users,DC=example,DC=com',
      objectGUID: 'guid-123',
      memberOf: ['IT-Admins'],
      accountExpires: new Date('2030-01-01'),
      whenCreated: new Date(),
      whenChanged: new Date(),
      lastLogon: new Date(),
      pwdLastSet: new Date(),
      userAccountControl: 512,
      enabled: true,
      givenName: 'Jan',
    },
    {
      name: 'Anna',
      surname: 'Nowak',
      email: 'anna.nowak@example.com',
      username: 'annan',
      phone: '+48 600 200 300',
      displayName: 'Anna Nowak',
      mailNickname: 'annan',
      userPrincipalName: 'annan@example.com',
      samAccountName: 'annan',
      title: 'Manager',
      department: 'Finance',
      company: 'TechCorp',
      office: 'Krakow Branch',
      physicalDeliveryOfficeName: 'Krakow Branch',
      streetAddress: 'ul. Inna 2',
      city: 'Kraków',
      postalCode: '30-001',
      country: 'Polska',
      manager: 'manager2',
      distinguishedName: 'CN=Anna Nowak,OU=Users,DC=example,DC=com',
      objectGUID: 'guid-456',
      memberOf: ['Finance-Team'],
      accountExpires: new Date('2030-01-01'),
      whenCreated: new Date(),
      whenChanged: new Date(),
      lastLogon: new Date(),
      pwdLastSet: new Date(),
      userAccountControl: 512,
      enabled: true,
      givenName: 'Anna',
    },
  ]);

  // ============================================
  // 2️⃣ Aplikacje
  // ============================================
  const applications = await dataSource.getRepository(Applications).save([
    {
      name: 'Microsoft Word',
      version: '16.0',
      size: 200,
      publisher: 'Microsoft',
    },
    {
      name: 'PostgreSQL',
      version: '15.3',
      size: 150,
      publisher: 'PostgreSQL Global Dev Group',
    },
    {
      name: 'Visual Studio Code',
      version: '1.81',
      size: 100,
      publisher: 'Microsoft',
    },
  ]);

  // ============================================
  // 3️⃣ Devices z folderu JSON
  // ============================================
  const devicesDir = path.join(__dirname, 'seeds', 'devices');
  const deviceFiles = fs
    .readdirSync(devicesDir)
    .filter((f) => f.endsWith('.json'));

  const devices: Devices[] = [];
  for (const file of deviceFiles) {
    const raw = fs.readFileSync(path.join(devicesDir, file), 'utf8');
    const json = JSON.parse(raw);

    const device = await dataSource.getRepository(Devices).save({
      group: 'Komputery',
      subgroup: 'Workstation',
      ownerId: users[0].id, // przypisz do Jana
      state: 'active',
      isOn: true,
      serialNumber: `SN-${file.replace('.json', '')}`,
      model: json.system_info?.system_name || 'Unknown',
      manufacturer: json.hardware_info?.baseboard?.manufacturer || 'Unknown',
      location: 'Warsaw HQ',

      system: json.system_info,
      hardware: json.hardware_info,
      software: json.software_info,
      network: json.network_info,
      users: json.users_info,
      security: json.security_info,
      peripherals: json.peripherals_info,
      eventLogs: json.event_logs,
    });

    devices.push(device);
  }

  // ============================================
  // 4️⃣ DevicesApplications (powiązania)
  // ============================================
  if (devices.length > 0) {
    await dataSource.getRepository(DevicesApplications).save([
      {
        deviceId: devices[0].id,
        applicationId: applications[0].id,
        installationDate: new Date('2023-01-01').toISOString(),
        modificationDate: new Date('2023-06-01').toISOString(),
      },
      {
        deviceId: devices[0].id,
        applicationId: applications[2].id,
        installationDate: new Date('2023-02-15').toISOString(),
        modificationDate: new Date('2023-07-01').toISOString(),
      },
    ]);
  }

  // ============================================
  // 5️⃣ Flows
  // ============================================
  await dataSource.getRepository(Flows).insert([
    { ownerId: users[0].id, name: 'Approval Flow 1', enabled: true },
    { ownerId: users[1].id, name: 'Finance Flow', enabled: false },
  ]);

  // ============================================
  // 6️⃣ Forms
  // ============================================
  await dataSource.getRepository(Forms).insert([
    {
      ownerId: users[0].id,
      name: 'Onboarding Form',
      url: 'https://example.com/forms/onboarding',
    },
    {
      ownerId: users[1].id,
      name: 'Expense Form',
      url: 'https://example.com/forms/expense',
    },
  ]);

  // ============================================
  // 7️⃣ Histories
  // ============================================
  await dataSource.getRepository(Histories).save([
    {
      ticket: 'TCK-001',
      date: new Date().toISOString(),
      details: 'Device check',
      justification: 'Routine maintenance',
      userId: users[0].id,
    },
    {
      ticket: 'TCK-002',
      date: new Date().toISOString(),
      details: 'Software update',
      justification: 'Security patch',
      userId: users[1].id,
    },
  ]);

  console.log(`✅ Seed zakończony! Wczytano ${devices.length} urządzeń.`);
  process.exit(0);
}

seed();
