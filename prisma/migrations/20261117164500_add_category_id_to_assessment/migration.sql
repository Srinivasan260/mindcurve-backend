-- Add `category_id` to `assessments` so every assessment is bound to one category.
-- Safe because the `assessments` table is empty at this point.

-- AlterTable
ALTER TABLE `assessments`
  ADD COLUMN `category_id` CHAR(36) NOT NULL AFTER `patient_id`;

-- CreateIndex
CREATE INDEX `assessments_category_id_idx` ON `assessments`(`category_id`);

-- AddForeignKey
ALTER TABLE `assessments`
  ADD CONSTRAINT `assessments_category_id_fkey`
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
