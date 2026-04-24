import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

/**
 * Catalog of applications known to the fleet. Keyed by the opaque `id` we
 * generate, but logically unique on (nameKey, publisherKey) where each
 * *Key is the trimmed-lowercase normalised form. The installed version
 * lives on `DevicesApplications`, not here — an app in the catalog can
 * have many installs at many versions.
 */
@Entity()
@Index(['nameKey', 'publisherKey'], { unique: true })
export class Applications {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  /** Lower-cased, trimmed `name`. Used for the uniqueness index. */
  @Column()
  nameKey: string;

  @Column({ type: 'varchar', nullable: true })
  publisher: string | null;

  /** Lower-cased, trimmed `publisher`, or empty string if unknown. */
  @Column({ default: '' })
  publisherKey: string;

  /** Legacy aggregate fields — kept nullable; not the source of truth. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  version: string | null;

  @Column({ type: 'bigint', nullable: true })
  size: number | null;
}
