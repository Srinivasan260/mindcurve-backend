import { Router } from 'express';
import activityAdminRoutes from './modules/activity/activity.admin.route.js';
import activityRoutes from './modules/activity/activity.route.js';
import assessmentAdminRoutes from './modules/assessment/assessment.admin.route.js';
import {
  assessmentCategoryRouter,
  assessmentRouter,
} from './modules/assessment/assessment.route.js';
import {
  noteByPatientRouter,
  noteRouter,
} from './modules/clinicalNote/clinicalNote.admin.route.js';
import dashboardAdminRoutes from './modules/dashboard/dashboard.admin.route.js';
import {
  followUpByPatientRouter,
  followUpRouter,
} from './modules/followUp/followUp.admin.route.js';
import patientAdminRoutes from './modules/patient/patient.admin.route.js';
import authAdminRoutes from './modules/auth/auth.admin.route.js';
import authRoutes from './modules/auth/auth.route.js';
import categoryAdminRoutes from './modules/category/category.admin.route.js';
import categoryRoutes from './modules/category/category.route.js';
import healthRoutes from './modules/health/health.route.js';
import {
  questionCategoryRouter,
  questionRouter,
} from './modules/question/question.admin.route.js';
import questionPatientRoutes from './modules/question/question.route.js';
import {
  riskBandCategoryRouter,
  riskBandRouter,
} from './modules/riskBand/riskBand.admin.route.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, message: 'Athma API v1', status: 'ok' });
});

// Public / patient routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/admin/auth', authAdminRoutes);
router.use('/categories', categoryRoutes);
router.use('/categories/:categoryId/questions', questionPatientRoutes);
router.use('/categories/:categoryId/assessments', assessmentCategoryRouter);
router.use('/assessments', assessmentRouter);
router.use('/activity', activityRoutes);

// Admin routes (each sub-router applies its own requireAuth + requireRole)
router.use('/admin/categories', categoryAdminRoutes);
router.use('/admin/categories/:categoryId/questions', questionCategoryRouter);
router.use('/admin/questions', questionRouter);
router.use('/admin/categories/:categoryId/risk-bands', riskBandCategoryRouter);
router.use('/admin/risk-bands', riskBandRouter);
router.use('/admin/patients', patientAdminRoutes);
router.use('/admin/patients/:patientId/notes', noteByPatientRouter);
router.use('/admin/notes', noteRouter);
router.use('/admin/patients/:patientId/follow-ups', followUpByPatientRouter);
router.use('/admin/follow-ups', followUpRouter);
router.use('/admin/assessments', assessmentAdminRoutes);
router.use('/admin/dashboard', dashboardAdminRoutes);
router.use('/admin/activity', activityAdminRoutes);

export default router;
