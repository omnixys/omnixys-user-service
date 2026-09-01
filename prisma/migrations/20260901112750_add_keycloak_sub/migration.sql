-- AlterTable
ALTER TABLE "user" ADD COLUMN     "keycloak_sub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_keycloak_sub_key" ON "user"("keycloak_sub");

