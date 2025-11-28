import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class DevicesApplications {
  @PrimaryColumn()
  id: string;

  @Column()
  deviceId: string;

  @Column()
  applicationId: string;

  @Column()
  installationDate: string;

  @Column()
  modificationDate: string;
}
