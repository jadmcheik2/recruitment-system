import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a new Job Draft (Assigned to creator userId)
  async create(userId: string, dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        type: dto.type,
        status: JobStatus.DRAFT,
        createdBy: userId,
      },
    });
  }

  // 2. Find all jobs with optional filtering (search term and status)
  async findAll(status?: string, search?: string) {
    const where: any = {};

    if (status) {
      const normalizedStatus = status.toUpperCase() as JobStatus;
      if (Object.values(JobStatus).includes(normalizedStatus)) {
        where.status = normalizedStatus;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.job.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        creator: {
          select: { id: true, email: true },
        },
      },
    });
  }

  // 3. Find a single job by ID
  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, email: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job posting with ID "${id}" not found`);
    }

    return job;
  }

  // 4. Update job details
  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id); // Throws NotFoundException if job does not exist

    return this.prisma.job.update({
      where: { id },
      data: dto,
    });
  }

  // 5. Publish job (DRAFT -> PUBLISHED workflow)
  async publish(id: string) {
    const job = await this.findOne(id);

    if (job.status === JobStatus.CLOSED) {
      throw new BadRequestException('Cannot publish a closed job');
    }

    return this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.PUBLISHED },
    });
  }

  // 6. Close job (PUBLISHED/DRAFT -> CLOSED)
  async close(id: string) {
    await this.findOne(id);

    return this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.CLOSED },
    });
  }
}
