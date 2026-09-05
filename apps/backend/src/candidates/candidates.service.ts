import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

@Injectable()
export class CandidatesService {
  private readonly uploadDir = path.join(os.tmpdir(), 'uploads', 'resumes');

  constructor(private readonly prisma: PrismaService) {
    // Ensure upload directory exists safely (supports Vercel serverless read-only disk)
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch {
      // Ignore directory creation error in serverless environment
    }
  }

  // 1. Find all candidates with search and skill filters
  async findAll(search?: string, skill?: string) {
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (skill) {
      where.skills = { has: skill };
    }

    return this.prisma.candidate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        user: {
          select: { id: true, email: true, status: true },
        },
      },
    });
  }

  // 2. Find candidate profile by candidate ID
  async findOne(id: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, status: true },
        },
        applications: {
          include: {
            job: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID "${id}" not found`);
    }

    return candidate;
  }

  // 3. Find candidate by User ID
  async findByUserId(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, email: true, status: true },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate profile not found for user "${userId}"`);
    }

    return candidate;
  }

  // 4. Update candidate profile (name, phone, skills)
  async update(id: string, dto: UpdateCandidateDto) {
    await this.findOne(id); // Throws NotFoundException if candidate does not exist

    return this.prisma.candidate.update({
      where: { id },
      data: dto,
    });
  }

  // 5. Upload Resume (Section 15 Requirements)
  async uploadResume(candidateId: string, file: any) {
    const candidate = await this.findOne(candidateId);

    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    // Validate MIME type (PDF, JPG, JPEG, PNG)
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.',
      );
    }

    // Generate unique storage key
    const fileExtension = path.extname(file.originalname);
    const uniqueStorageKey = `resume_${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, uniqueStorageKey);

    // Save file to disk safely
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
      fs.writeFileSync(filePath, file.buffer);
    } catch {
      throw new BadRequestException('Failed to write file to storage');
    }

    // Delete old resume file if it exists
    if (candidate.resumeKey) {
      const oldFilePath = path.join(this.uploadDir, candidate.resumeKey);
      if (fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch {
          // Ignore error if old file wasn't found
        }
      }
    }

    // Update candidate record in PostgreSQL
    return this.prisma.candidate.update({
      where: { id: candidateId },
      data: { resumeKey: uniqueStorageKey },
    });
  }

  // 6. Get Resume file path for download
  async getResumeFile(candidateId: string) {
    const candidate = await this.findOne(candidateId);

    if (!candidate.resumeKey) {
      throw new NotFoundException('No resume uploaded for this candidate');
    }

    const filePath = path.join(this.uploadDir, candidate.resumeKey);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Resume file not found on server');
    }

    return {
      filePath,
      fileName: candidate.resumeKey,
    };
  }
}
