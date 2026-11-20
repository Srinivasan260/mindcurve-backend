-- ============================================================================
-- Migration: widen_risk_band_score_bounds
--
-- Widens `category_risk_bands.min_score` and `max_score` from INT to
-- DECIMAL(10, 4) so that subscale_mean_band (BFI-10-style) categories can
-- store fractional boundaries like 1.5 – 2.4.
--
-- Safe: INT → DECIMAL is a lossless widening. Existing integer values
-- (ISAA / SCARED cutoffs) are preserved.
-- ============================================================================

ALTER TABLE `category_risk_bands`
  MODIFY COLUMN `min_score` DECIMAL(10, 4) NOT NULL,
  MODIFY COLUMN `max_score` DECIMAL(10, 4) NOT NULL;
