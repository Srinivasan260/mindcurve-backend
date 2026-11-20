import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authService } from './auth.service.js';
import type { LoginInput, MagicLoginInput, RegisterInput } from './auth.validation.js';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body as RegisterInput);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email for the login link.',
      data: result,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body as LoginInput, {
      allowedRoles: ['patient'],
      via: 'patient_login',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  }),

  adminLogin: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body as LoginInput, {
      allowedRoles: ['admin', 'doctor'],
      via: 'admin_login',
    });

    res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      data: result,
    });
  }),

  magicLogin: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.magicLogin(req.body as MagicLoginInput);

    res.status(200).json({
      success: true,
      message: 'Magic link verified. You are signed in.',
      data: result,
    });
  }),
};
