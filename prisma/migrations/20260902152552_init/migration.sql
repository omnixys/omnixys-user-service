-- CreateEnum
CREATE TYPE "user_type" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'GUEST');

-- CreateEnum
CREATE TYPE "phone_number_type" AS ENUM ('WHATSAPP', 'MOBILE', 'PRIVATE', 'WORK', 'HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "person_status" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED', 'INACTIVE', 'BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "gender_type" AS ENUM ('MALE', 'FEMALE', 'DIVERSE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "relationship_type" AS ENUM ('FAMILY', 'FRIEND', 'PARTNER', 'COLLEAGUE', 'OTHER', 'BUSINESS_PARTNER', 'RELATIVE', 'PARENT', 'SIBLING', 'CHILD', 'COUSIN');

-- CreateEnum
CREATE TYPE "marital_status_type" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "status_type" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "interest_key" AS ENUM ('BANK_PRODUCTS_AND_SERVICES', 'TECHNOLOGY_AND_INNOVATION', 'FINANCIAL_EDUCATION_AND_COUNSELING', 'SUSTAINABLE_FINANCE', 'INVESTMENTS', 'SAVING_AND_FINANCE', 'CREDIT_AND_DEBT', 'REAL_ESTATE', 'INSURANCE', 'TRAVEL', 'CLASSIC', 'ROCK', 'HIPHOP', 'RAP', 'FOOTBALL', 'SOCCER', 'RUGBY', 'BASKETBALL');

-- CreateEnum
CREATE TYPE "interest_category_key" AS ENUM ('SPORTS', 'MUSIC', 'FINANCE', 'REAL_ASSETS', 'TECHNOLOGY', 'LIFESTYLE');

-- CreateEnum
CREATE TYPE "contact_options_type" AS ENUM ('EMAIL', 'PHONE', 'SMS', 'WHATSAPP', 'LETTER');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "keycloak_sub" TEXT NOT NULL,
    "user_type" "user_type" NOT NULL,
    "status" "person_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_info" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3),
    "gender" "gender_type",
    "marital_status" "marital_status_type",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" UUID NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "customer_state" "status_type" NOT NULL,
    "contact_options" "contact_options_type"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" UUID NOT NULL,
    "department" TEXT,
    "position" TEXT,
    "role" TEXT,
    "salary" DOUBLE PRECISION,
    "hire_date" TIMESTAMP(3),
    "is_external" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_number" (
    "id" UUID NOT NULL,
    "info_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "type" "phone_number_type" NOT NULL,
    "label" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "country_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_number_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "relationship" "relationship_type" NOT NULL,
    "withdrawal_limit" INTEGER NOT NULL DEFAULT 0,
    "emergency" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest_category" (
    "id" UUID NOT NULL,
    "key" "interest_category_key" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interest" (
    "id" UUID NOT NULL,
    "key" "interest_key" NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_interest" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,
    "level" INTEGER,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_outbox" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlation_id" TEXT,
    "actor_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "published_at" TIMESTAMP(3),
    "dead_lettered_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_keycloak_sub_key" ON "user"("keycloak_sub");

-- CreateIndex
CREATE INDEX "user_status_idx" ON "user"("status");

-- CreateIndex
CREATE INDEX "user_user_type_idx" ON "user"("user_type");

-- CreateIndex
CREATE INDEX "user_status_user_type_idx" ON "user"("status", "user_type");

-- CreateIndex
CREATE INDEX "user_created_at_idx" ON "user"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "personal_info_email_key" ON "personal_info"("email");

-- CreateIndex
CREATE INDEX "personal_info_last_name_idx" ON "personal_info"("last_name");

-- CreateIndex
CREATE INDEX "personal_info_first_name_last_name_idx" ON "personal_info"("first_name", "last_name");

-- CreateIndex
CREATE INDEX "customer_customer_state_idx" ON "customer"("customer_state");

-- CreateIndex
CREATE INDEX "customer_subscribed_idx" ON "customer"("subscribed");

-- CreateIndex
CREATE INDEX "employee_department_idx" ON "employee"("department");

-- CreateIndex
CREATE INDEX "employee_role_idx" ON "employee"("role");

-- CreateIndex
CREATE INDEX "employee_is_external_idx" ON "employee"("is_external");

-- CreateIndex
CREATE INDEX "phone_number_country_code_number_idx" ON "phone_number"("country_code", "number");

-- CreateIndex
CREATE INDEX "phone_number_info_id_idx" ON "phone_number"("info_id");

-- CreateIndex
CREATE INDEX "phone_number_info_id_is_primary_idx" ON "phone_number"("info_id", "is_primary");

-- CreateIndex
CREATE INDEX "contact_user_id_idx" ON "contact"("user_id");

-- CreateIndex
CREATE INDEX "contact_emergency_idx" ON "contact"("emergency");

-- CreateIndex
CREATE UNIQUE INDEX "contact_user_id_contact_id_key" ON "contact"("user_id", "contact_id");

-- CreateIndex
CREATE UNIQUE INDEX "interest_category_key_key" ON "interest_category"("key");

-- CreateIndex
CREATE UNIQUE INDEX "interest_key_key" ON "interest"("key");

-- CreateIndex
CREATE INDEX "interest_category_id_idx" ON "interest"("category_id");

-- CreateIndex
CREATE INDEX "customer_interest_interest_id_idx" ON "customer_interest"("interest_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_interest_customer_id_interest_id_key" ON "customer_interest"("customer_id", "interest_id");

-- CreateIndex
CREATE INDEX "analytics_outbox_published_at_dead_lettered_at_next_attempt_idx" ON "analytics_outbox"("published_at", "dead_lettered_at", "next_attempt_at");

-- AddForeignKey
ALTER TABLE "personal_info" ADD CONSTRAINT "personal_info_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_id_fkey" FOREIGN KEY ("id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_number" ADD CONSTRAINT "phone_number_info_id_fkey" FOREIGN KEY ("info_id") REFERENCES "personal_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact" ADD CONSTRAINT "contact_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interest" ADD CONSTRAINT "interest_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "interest_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_interest" ADD CONSTRAINT "customer_interest_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_interest" ADD CONSTRAINT "customer_interest_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
