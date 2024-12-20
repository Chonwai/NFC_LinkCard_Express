import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './User';
import { Profile } from './Profile';

@Entity()
export class Link {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    title: string;

    @Column()
    url: string;

    @Column({ nullable: true })
    description: string;

    @Column({ default: true })
    isActive: boolean;

    @Column({ default: 0 })
    clickCount: number;

    @Column({ nullable: true })
    icon: string;

    @ManyToOne(() => User, (user) => user.links)
    user: User;

    @Column({ default: 0 })
    displayOrder: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Profile, (profile) => profile.links)
    profile: Profile;

    @Column({ type: 'json', nullable: true, default: {} })
    meta: object;

    @Column({
        type: 'enum',
        enum: ['CUSTOM', 'SOCIAL'],
        default: 'CUSTOM',
    })
    type: 'CUSTOM' | 'SOCIAL';

    @Column({ nullable: true })
    platform: string;
}
