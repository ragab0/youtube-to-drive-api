import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  googleSub: string;

  @Column()
  email: string;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
