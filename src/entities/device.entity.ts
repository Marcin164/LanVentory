import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Device {
  @PrimaryGeneratedColumn()
  iddevices: number;

  @Column()
  type: string;

  @Column()
  owner: string;

  @Column()
  state: string; //is it damaged or not

  @Column()
  isOn: boolean;

  @Column()
  serialNumber: string;

  @Column({ type: 'longtext' })
  scanInfo: string;

  @Column()
  model: string;

  @Column()
  location: string;

  // @Column()
  // system: string;

  // @Column()
  // hardware: string;

  // @Column()
  // software: string;

  // @Column()
  // network: string;

  // @Column()
  // users: string;

  // @Column()
  // security: string;
}
