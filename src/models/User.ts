import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { Link } from './Link';
import { Profile } from './Profile';
import * as bcrypt from 'bcryptjs';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column({ unique: true })
    email: string;

    @Column()
    @Exclude()
    password: string;

    @Column({ nullable: true })
    displayName: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ nullable: true })
    bio: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Link, (link) => link.user)
    links: Link[];

    @OneToMany(() => Profile, (profile) => profile.user)
    profiles: Profile[];

    @Column({ default: false })
    @Exclude()
    isVerified: boolean;

    @Column({ nullable: true })
    @Exclude()
    verificationToken: string;

    @Column({ nullable: true })
    @Exclude()
    resetPasswordToken: string;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.password);
    }
}
