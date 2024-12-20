import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    Unique,
    JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Link } from './Link';

@Entity()
@Unique('UQ_USER_DEFAULT_PROFILE', ['userId', 'isDefault'])
export class Profile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, (user) => user.profiles)
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(() => Link, (link) => link.profile)
    links: Link[];

    @Column({ nullable: true })
    customDomain: string;

    @Column({ default: true })
    isPublic: boolean;

    @Column({ default: false })
    isDefault: boolean;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    profileImage: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'json', nullable: true, default: {} })
    meta: object;

    @Column({ type: 'json', nullable: true, default: {} })
    appearance: {
        theme?: string;
        backgroundColor?: string;
        buttonStyle?: string;
        fontFamily?: string;
        customCSS?: string;
        buttonRadius?: string;
        buttonAnimation?: string;
        layout?: 'list' | 'grid';
    };
}
