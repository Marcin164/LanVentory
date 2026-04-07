import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Forms {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  mimetype: string;

  @Column({ type: 'bigint', nullable: true })
  size: number;

  @CreateDateColumn({ nullable: true })
  createdAt: Date;
}
