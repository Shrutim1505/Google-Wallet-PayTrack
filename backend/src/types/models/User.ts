import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Receipt } from './Receipt';
import { UserPreferences } from 'types/user';

@Entity('users')
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ default: 'Asia/Kolkata' })
  timezone: string;

  @Column('jsonb', { default: () => "'{}'" })
  preferences: UserPreferences;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Receipt, (receipt) => receipt.user, { cascade: true })
  receipts: Receipt[];
}