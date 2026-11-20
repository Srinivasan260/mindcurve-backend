import { Prisma, type TokenPurpose } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

export interface CreatePatientInput {
  email: string;
  passwordHash: string;
  profile: Omit<Prisma.PatientProfileUncheckedCreateInput, 'id' | 'userId'>;
}

export interface CreateEmailTokenInput {
  userId: string;
  tokenHash: string;
  purpose: TokenPurpose;
  expiresAt: Date;
}

export interface LogActivityInput {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

export const authRepository = {
  findUserByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findUserByEmailWithProfile: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      include: { patientProfile: true },
    }),

  updateLastLogin: (userId: string) =>
    prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    }),

  createPatient: async ({ email, passwordHash, profile }: CreatePatientInput) =>
    prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'patient',
        },
      });

      const patientProfile = await tx.patientProfile.create({
        data: {
          ...profile,
          userId: user.id,
        },
      });

      return { user, patientProfile };
    }),

  createEmailToken: ({ userId, tokenHash, purpose, expiresAt }: CreateEmailTokenInput) =>
    prisma.emailToken.create({
      data: { userId, tokenHash, purpose, expiresAt },
    }),

  findActiveEmailToken: (tokenHash: string, purpose: TokenPurpose) =>
    prisma.emailToken.findFirst({
      where: {
        tokenHash,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { include: { patientProfile: true } },
      },
    }),

  consumeMagicToken: (tokenId: string, userId: string) =>
    prisma.$transaction(async (tx) => {
      await tx.emailToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      });
      return tx.user.update({
        where: { id: userId },
        data: {
          isEmailVerified: true,
          lastLoginAt: new Date(),
        },
        include: { patientProfile: true },
      });
    }),

  logActivity: ({ actorId, action, entityType, entityId, metadata }: LogActivityInput) =>
    prisma.activityLog.create({
      data: {
        actorId,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        metadata: metadata ?? Prisma.JsonNull,
      },
    }),
};

export type AuthRepository = typeof authRepository;
