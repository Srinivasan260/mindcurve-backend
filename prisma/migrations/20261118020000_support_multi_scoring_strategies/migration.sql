-- ============================================================================
-- Migration: support_multi_scoring_strategies
--
-- Enables three assessment scoring recipes on top of the existing schema:
--   1. "total"                → ISAA-style (sum all → one risk band)
--   2. "subscale_sum_cutoff"  → SCARED-style (sum per subscale → cutoff flag)
--   3. "subscale_mean_band"   → BFI-10-style (mean per trait → benchmark band,
--                                              with per-question reverse scoring)
--
-- Safety: all new columns are nullable or have safe defaults. Index swaps
-- are done CREATE-then-DROP so the FK always has a covering index.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. categories: add scoring_type
-- ----------------------------------------------------------------------------
ALTER TABLE `categories`
  ADD COLUMN `scoring_type` VARCHAR(40) NOT NULL DEFAULT 'total' AFTER `description`;


-- ----------------------------------------------------------------------------
-- 2. questions: add subscale + is_reverse_scored
-- ----------------------------------------------------------------------------
ALTER TABLE `questions`
  ADD COLUMN `subscale` VARCHAR(80) NULL AFTER `question_type`,
  ADD COLUMN `is_reverse_scored` BOOLEAN NOT NULL DEFAULT FALSE AFTER `subscale`;

CREATE INDEX `questions_subscale_idx` ON `questions`(`subscale`);


-- ----------------------------------------------------------------------------
-- 3. category_risk_bands: add subscale + widen level + swap unique index
-- ----------------------------------------------------------------------------
ALTER TABLE `category_risk_bands`
  ADD COLUMN `subscale` VARCHAR(80) NULL AFTER `category_id`,
  MODIFY COLUMN `level` VARCHAR(40) NOT NULL;

-- Create NEW unique BEFORE dropping old. Both start with `category_id`, so
-- the FK on category_id always has a covering index (MySQL requires this).
CREATE UNIQUE INDEX `category_risk_bands_category_id_subscale_level_key`
  ON `category_risk_bands`(`category_id`, `subscale`, `level`);

ALTER TABLE `category_risk_bands`
  DROP INDEX `category_risk_bands_category_id_level_key`;


-- ----------------------------------------------------------------------------
-- 4. assessment_category_results: add subscale + widen types + swap index
-- ----------------------------------------------------------------------------
ALTER TABLE `assessment_category_results`
  ADD COLUMN `subscale` VARCHAR(80) NULL AFTER `category_id`,
  MODIFY COLUMN `total_score` DECIMAL(10, 4) NOT NULL,
  MODIFY COLUMN `risk_level` VARCHAR(40) NOT NULL;

CREATE UNIQUE INDEX `acr_asmt_cat_sub_key`
  ON `assessment_category_results`(`assessment_id`, `category_id`, `subscale`);

ALTER TABLE `assessment_category_results`
  DROP INDEX `assessment_category_results_assessment_id_category_id_key`;


-- ----------------------------------------------------------------------------
-- 5. assessments.overall_risk_level — widen to VARCHAR for consistency
-- ----------------------------------------------------------------------------
ALTER TABLE `assessments`
  MODIFY COLUMN `overall_risk_level` VARCHAR(40) NULL;
