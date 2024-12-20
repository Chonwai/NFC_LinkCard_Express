import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1734724003018 implements MigrationInterface {
    name = 'InitialMigration1734724003018';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "profile" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "user_id" character varying NOT NULL, "custom_domain" character varying, "is_public" boolean NOT NULL DEFAULT true, "is_default" boolean NOT NULL DEFAULT false, "description" character varying, "profile_image" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "meta" json DEFAULT '{}', "appearance" json DEFAULT '{}', "userId" uuid, CONSTRAINT "UQ_320e259757524e1b21cd08d0f1f" UNIQUE ("slug"), CONSTRAINT "UQ_USER_DEFAULT_PROFILE" UNIQUE ("user_id", "is_default"), CONSTRAINT "PK_3dd8bfc97e4a77c70971591bdcb" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TYPE "public"."link_type_enum" AS ENUM('CUSTOM', 'SOCIAL')`,
        );
        await queryRunner.query(
            `CREATE TABLE "link" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "url" character varying NOT NULL, "description" character varying, "is_active" boolean NOT NULL DEFAULT true, "click_count" integer NOT NULL DEFAULT '0', "icon" character varying, "display_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "meta" json DEFAULT '{}', "type" "public"."link_type_enum" NOT NULL DEFAULT 'CUSTOM', "platform" character varying, "user_id" uuid, "profile_id" uuid, CONSTRAINT "PK_26206fb7186da72fbb9eaa3fac9" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "display_name" character varying, "avatar" character varying, "bio" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "is_verified" boolean NOT NULL DEFAULT false, "verification_token" character varying, "reset_password_token" character varying, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "analytics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "visitor_ip" character varying NOT NULL, "user_agent" character varying, "referer" character varying, "country" character varying, "city" character varying, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "meta" json DEFAULT '{}', "user_id" uuid, "link_id" uuid, CONSTRAINT "PK_3c96dcbf1e4c57ea9e0c3144bff" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "profile" ADD CONSTRAINT "FK_a24972ebd73b106250713dcddd9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "link" ADD CONSTRAINT "FK_da35233ec2bfaa121bb3540039b" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "link" ADD CONSTRAINT "FK_9a4590ce471c79eca797a4bc66e" FOREIGN KEY ("profile_id") REFERENCES "profile"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "analytics" ADD CONSTRAINT "FK_478656673247334d8cea26a2c12" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "analytics" ADD CONSTRAINT "FK_745598dba220fec7072dd36474d" FOREIGN KEY ("link_id") REFERENCES "link"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "analytics" DROP CONSTRAINT "FK_745598dba220fec7072dd36474d"`,
        );
        await queryRunner.query(
            `ALTER TABLE "analytics" DROP CONSTRAINT "FK_478656673247334d8cea26a2c12"`,
        );
        await queryRunner.query(
            `ALTER TABLE "link" DROP CONSTRAINT "FK_9a4590ce471c79eca797a4bc66e"`,
        );
        await queryRunner.query(
            `ALTER TABLE "link" DROP CONSTRAINT "FK_da35233ec2bfaa121bb3540039b"`,
        );
        await queryRunner.query(
            `ALTER TABLE "profile" DROP CONSTRAINT "FK_a24972ebd73b106250713dcddd9"`,
        );
        await queryRunner.query(`DROP TABLE "analytics"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "link"`);
        await queryRunner.query(`DROP TYPE "public"."link_type_enum"`);
        await queryRunner.query(`DROP TABLE "profile"`);
    }
}
