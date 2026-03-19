import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { ExpenseCategory } from 'types/common';

@Entity('budgets')
export class Budget {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
  })
  category: ExpenseCategory;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  period: 'weekly' | 'monthly' | 'yearly';

  @Column({ default: false })
  alertEnabled: boolean;

  @Column({ default: 80 })
  alertThreshold: number; // percentage

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}