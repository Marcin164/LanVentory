import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';

@Entity()
export class Users {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  surname: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  distinguishedName: string;

  @Column({ nullable: true })
  userAccountControl: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  title: string; // stanowisko

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  office: string;

  @Column({ nullable: true })
  streetAddress: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  manager: string; // DN lub ID managera

  @Column({ type: 'jsonb', nullable: true })
  memberOf: Record<string, any>;

  @Column({ nullable: true })
  whenCreated: string;

  @Column({ nullable: true })
  pwdLastSet: string;
}
