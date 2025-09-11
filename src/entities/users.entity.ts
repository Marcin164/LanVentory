import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  idusers: number;

  @Column()
  name: string;

  @Column()
  surname: string;

  @Column()
  email: string;

  @Column()
  username: string;

  @Column()
  phone: string;

  @Column()
  displayName: string; // pełna nazwa wyświetlana

  @Column()
  mailNickname: string; // alias emailowy

  @Column()
  userPrincipalName: string; // np. username@domain.com

  @Column()
  samAccountName: string; // login (starszy format)

  @Column()
  title: string; // stanowisko

  @Column()
  department: string;

  @Column()
  company: string;

  @Column()
  office: string;

  @Column()
  physicalDeliveryOfficeName: string; // nazwa biura (lokalizacja)

  @Column()
  streetAddress: string;

  @Column()
  city: string;

  @Column()
  postalCode: string;

  @Column()
  country: string;

  @Column()
  manager: string; // DN lub ID managera

  @Column()
  distinguishedName: string;

  @Column()
  objectGUID: string;

  @Column()
  memberOf: string; // grupy, do których należy

  @Column()
  accountExpires: Date;

  @Column()
  whenCreated: Date;

  @Column()
  whenChanged: Date;

  @Column()
  lastLogon: Date;

  @Column()
  pwdLastSet: Date;

  @Column()
  userAccountControl: number; // flags – np. czy konto aktywne, wymaga hasła itd.

  @Column()
  enabled: boolean; // ułatwienie – true/false czy aktywne

  @Column()
  givenName: string; // imię (jeśli chcesz rozdzielić `name`)
}
