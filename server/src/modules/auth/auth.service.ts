import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { generateReferralCode } from '../../utils/crypto';
import { SignupInput, LoginInput } from './auth.validators';

export class AuthService {
  static async signup(input: SignupInput) {
    const { email, username, password, referralCode } = input;

    // Check existing user
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      if (existingUser.email === email) throw { statusCode: 409, message: 'Email already registered' };
      throw { statusCode: 409, message: 'Username already taken' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Handle referral
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) referredById = referrer.id;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        referralCode: generateReferralCode(),
        referredById,
      },
    });

    // Create referral record if referred
    if (referredById) {
      await prisma.referral.create({
        data: {
          referrerId: referredById,
          refereeId: user.id,
          code: referralCode!,
          pointsEarned: 100, // Signup bonus for referrer
        },
      });

      // Award referral points to referrer
      await prisma.user.update({
        where: { id: referredById },
        data: { totalPoints: { increment: 100 } },
      });

      await prisma.pointsTransaction.create({
        data: {
          userId: referredById,
          amount: 100,
          type: 'REFERRAL',
          source: `Referral signup: ${username}`,
        },
      });
    }

    // Generate token
    const token = this.generateToken(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  static async login(input: LoginInput) {
    const { email, password } = input;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw { statusCode: 401, message: 'Invalid email or password' };
    }

    if (!user.isActive) {
      throw { statusCode: 403, message: 'Account is deactivated' };
    }

    const token = this.generateToken(user.id, user.role);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        nodes: { select: { id: true, type: true, status: true, lastHeartbeat: true, connectionQuality: true } },
        _count: {
          select: {
            referralsMade: true,
            taskCompletions: { where: { status: 'VERIFIED' } },
          },
        },
      },
    });

    if (!user) throw { statusCode: 404, message: 'User not found' };
    return this.sanitizeUser(user);
  }

  static async googleLogin(googleId: string, email: string, name: string) {
    // Find or create user by googleId
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // Check if email already exists
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId },
        });
      } else {
        // Create new user
        const username = name.replace(/\s+/g, '_').toLowerCase() + '_' + Math.random().toString(36).slice(2, 6);
        user = await prisma.user.create({
          data: {
            email,
            username,
            googleId,
            referralCode: generateReferralCode(),
          },
        });
      }
    }

    if (!user.isActive) {
      throw { statusCode: 403, message: 'Account is deactivated' };
    }

    const token = this.generateToken(user.id, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  static async walletLogin(walletAddress: string, signature: string, message: string) {
    // Verify signature against message using ethers
    let recoveredAddress: string;
    try {
      // Lazy load ethers since it's only needed here
      const { ethers } = require('ethers');
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw { statusCode: 400, message: 'Invalid signature format' };
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw { statusCode: 401, message: 'Signature verification failed' };
    }

    let user = await prisma.user.findUnique({ where: { walletAddress } });

    if (!user) {
      const username = 'wallet_' + walletAddress.slice(2, 10).toLowerCase();
      user = await prisma.user.create({
        data: {
          username,
          walletAddress,
          referralCode: generateReferralCode(),
        },
      });
    }

    if (!user.isActive) {
      throw { statusCode: 403, message: 'Account is deactivated' };
    }

    const token = this.generateToken(user.id, user.role);
    return { user: this.sanitizeUser(user), token };
  }

  static async linkWallet(userId: string, walletAddress: string, signature: string, message: string) {
    // Verify signature against message using ethers
    let recoveredAddress: string;
    try {
      const { ethers } = require('ethers');
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw { statusCode: 400, message: 'Invalid signature format' };
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw { statusCode: 401, message: 'Signature verification failed' };
    }

    // Check if wallet is already connected to another account
    const existing = await prisma.user.findFirst({
      where: { walletAddress, id: { not: userId } }
    });
    if (existing) {
      throw { statusCode: 400, message: 'This wallet is already linked to another account' };
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: { walletAddress }
    });

    // Check and trigger achievements / tasks
    try {
      const { AchievementService } = require('../gamification/achievement.service');
      await AchievementService.checkAchievements(userId, 'task', { taskTitle: 'Connect Wallet' });
    } catch (achError) {
      console.error('Error triggering wallet_connected achievement:', achError);
    }

    return this.sanitizeUser(user);
  }

  private static generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  private static sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
