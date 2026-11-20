import { env } from '../../config/env.js';
import { emailService } from '../../services/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { signToken } from '../../utils/jwt.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { generateToken, hashToken } from '../../utils/token.js';
import { authRepository } from './auth.repository.js';
import type { LoginInput, MagicLoginInput, RegisterInput } from './auth.validation.js';

export interface RegisterResult {
  userId: string;
  email: string;
}

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'patient' | 'admin' | 'doctor';
    fullName: string | null;
    isEmailVerified: boolean;
  };
}

const buildMagicLink = (rawToken: string): string =>
  `${env.appUrl.replace(/\/$/, '')}/auth/magic-login?token=${rawToken}`;

export const authService = {
  register: async (input: RegisterInput): Promise<RegisterResult> => {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);

    const { user } = await authRepository.createPatient({
      email: input.email,
      passwordHash,
      profile: {
        fullName: input.fullName,
        phone: input.phone,
        age: input.age,
        gender: input.gender,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        location: input.location,
        maritalStatus: input.maritalStatus,
        education: input.education,
        occupation: input.occupation,
        referredBy: input.referredBy,
        consentAcceptedAt: new Date(),
      },
    });

    const { raw, hash } = generateToken();
    const expiresAt = new Date(Date.now() + env.magicLinkTtlMinutes * 60 * 1000);

    await authRepository.createEmailToken({
      userId: user.id,
      tokenHash: hash,
      purpose: 'magic_login',
      expiresAt,
    });

    await emailService.sendMagicLink({
      to: user.email,
      fullName: input.fullName,
      loginUrl: buildMagicLink(raw),
    });

    await authRepository.logActivity({
      actorId: user.id,
      action: 'registered',
      entityType: 'user',
      entityId: user.id,
    });

    return { userId: user.id, email: user.email };
  },

  /**
   * Shared login core. The route layer picks which roles are allowed so a
   * patient can't sign in via /admin/auth/login and vice versa.
   *
   * Error strategy:
   * - Bad email OR bad password → 401 "Invalid email or password" (identical
   *   message so an attacker can't enumerate which users exist).
   * - Right credentials but wrong endpoint for the user's role → 403 with a
   *   helpful hint. This only fires AFTER password verification, so it never
   *   leaks whether an arbitrary email belongs to an admin.
   */
  login: async (
    input: LoginInput,
    options: { allowedRoles: readonly ('patient' | 'admin' | 'doctor')[]; via: 'patient_login' | 'admin_login' },
  ): Promise<LoginResult> => {
    const user = await authRepository.findUserByEmailWithProfile(input.email);
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account is disabled. Contact support.');
    }

    const passwordOk = await comparePassword(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!options.allowedRoles.includes(user.role)) {
      const message =
        user.role === 'patient'
          ? 'Patient accounts must use the regular login page.'
          : 'Admin accounts must use the admin login page.';
      throw new ApiError(403, message);
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await authRepository.updateLastLogin(user.id);

    await authRepository.logActivity({
      actorId: user.id,
      action: 'logged_in',
      entityType: 'user',
      entityId: user.id,
      metadata: { via: options.via },
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.patientProfile?.fullName ?? null,
        isEmailVerified: user.isEmailVerified,
      },
    };
  },

  magicLogin: async (input: MagicLoginInput): Promise<LoginResult> => {
    const tokenHash = hashToken(input.token);
    const record = await authRepository.findActiveEmailToken(tokenHash, 'magic_login');
    if (!record) {
      throw new ApiError(401, 'Invalid or expired magic link');
    }

    if (!record.user.isActive) {
      throw new ApiError(403, 'Your account is disabled. Contact support.');
    }

    const updatedUser = await authRepository.consumeMagicToken(record.id, record.user.id);

    const jwt = signToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    await authRepository.logActivity({
      actorId: updatedUser.id,
      action: 'logged_in',
      entityType: 'user',
      entityId: updatedUser.id,
      metadata: { via: 'magic_link' },
    });

    return {
      token: jwt,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        fullName: updatedUser.patientProfile?.fullName ?? null,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    };
  },
};
