import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { ExpenseCategory } from 'types/common';

@Entity('receipts')
@Index(['userId', 'createdAt'])
@Index(['userId', 'category'])
@Index(['userId', 'date'])
export class Receipt {
  @PrimaryColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  vendor: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ default: 'INR' })
  currency: string;

  @Column()
  date: Date;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    default: ExpenseCategory.OTHER,
  })
  category: ExpenseCategory;

  @Column('jsonb', { nullable: true })
  items: any[];

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  notes: string;

  @Column('text', { array: true, default: () => "'{}'" })
  tags: string[];

  @Column('jsonb', { nullable: true })
  ocrData: any;

  @Column({ default: false })
  isManualEntry: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.receipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}