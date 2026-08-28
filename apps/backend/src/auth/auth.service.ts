import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // 1. Register new Applicant account
  async register(dto: RegisterDto) {
    // Check if email already exists in PostgreSQL
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    // Find default Applicant role
    const applicantRole = await this.prisma.role.findUnique({
      where: { name: 'Applicant' },
    });

    if (!applicantRole) {
      throw new NotFoundException('Default Applicant role not found. Please run seed.');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create User and Candidate profile in PostgreSQL
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          roleId: applicantRole.id,
        },
      });

      await tx.candidate.create({
        data: {
          userId: user.id,
          name: dto.name,
        },
      });

      return {
        id: user.id,
        email: user.email,
        role: applicantRole.name,
        message: 'Applicant registered successfully',
      };
    });
  }

  // 2. Login user and return JWT Access & Refresh Tokens
  async login(dto: LoginDto) {
    // Find user by email in PostgreSQL
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT Access and Refresh tokens
    const payload = { sub: user.id, email: user.email, role: user.role.name };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET') || 'supersecret_access_key',
      expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'supersecret_refresh_key',
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
      },
    };
  }
}
