import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class DevicesApplications {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deviceId: number;

  @Column()
  applicationId: number;

  @Column()
  installationDate: string;

  @Column()
  modificationDate: string;
}
