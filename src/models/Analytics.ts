import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Link } from './Link';

@Entity()
export class Analytics {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => Link, { nullable: true })
    link: Link;

    @Column()
    visitorIP: string;

    @Column({ nullable: true })
    userAgent: string;

    @Column({ nullable: true })
    referer: string;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    city: string;

    @CreateDateColumn()
    timestamp: Date;

    @Column({ type: 'json', nullable: true, default: {} })
    meta: object;
}
