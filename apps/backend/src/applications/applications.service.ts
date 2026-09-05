import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationStatus, JobStatus } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Submit a Job Application (Candidate)
  async apply(candidateId: string, jobId: string, dto: CreateApplicationDto) {
    // Verify Job exists and is in PUBLISHED status
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException(`Job opening with ID "${jobId}" not found`);
    }

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Cannot apply to a job that is not published');
    }

    // Get candidate to find their user ID
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate profile with ID "${candidateId}" not found`);
    }

    // Check if candidate already applied to this job
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        candidateId,
        jobId,
      },
    });

    if (existingApplication) {
      throw new ConflictException('You have already submitted an application for this job opening');
    }

    // Create Application and initial ApplicationEvent log in a transaction
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          candidateId,
          jobId,
          status: ApplicationStatus.APPLIED,
        },
        include: {
          job: true,
          candidate: true,
        },
      });

      // Log initial application creation event (Section 13 Audit Trail)
      await tx.applicationEvent.create({
        data: {
          application: { connect: { id: application.id } },
          fromStatus: null,
          toStatus: ApplicationStatus.APPLIED,
          changer: { connect: { id: candidate.userId } },
        },
      });

      return application;
    });
  }

  // 2. Search & List applications with flexible filters
  async findAll(
    jobId?: string,
    candidateId?: string,
    recruiterId?: string,
    status?: ApplicationStatus,
  ) {
    const where: any = {};

    if (jobId) where.jobId = jobId;
    if (candidateId) where.candidateId = candidateId;
    if (recruiterId) where.recruiterId = recruiterId;
    if (status) where.status = status;

    return this.prisma.application.findMany({
      where,
      include: {
        job: true,
        candidate: true,
        recruiter: {
          select: { id: true, email: true },
        },
        events: {
          take: 1,
        },
      },
    });
  }

  // 3. Find single application details by ID with full status event history
  async findOne(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        job: true,
        candidate: {
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        },
        recruiter: {
          select: { id: true, email: true },
        },
        events: {
          include: {
            changer: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    return application;
  }

  // 4. Update Pipeline Status (Section 5 State Machine & Section 13 Event Logging)
  async updateStatus(
    id: string,
    changedById: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const application = await this.findOne(id);
    const oldStatus = application.status;

    if (oldStatus === dto.status) {
      throw new BadRequestException(`Application is already in "${dto.status}" status`);
    }

    // Update status and log audit event in a transaction
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id },
        data: { status: dto.status },
        include: {
          job: true,
          candidate: true,
        },
      });

      // Record status transition in application_events table
      await tx.applicationEvent.create({
        data: {
          application: { connect: { id } },
          fromStatus: oldStatus,
          toStatus: dto.status,
          changer: { connect: { id: changedById } },
        },
      });

      return updated;
    });
  }

  // 5. Assign Recruiter to Application
  async assignRecruiter(id: string, recruiterId: string) {
    await this.findOne(id);

    // Verify recruiter user exists
    const recruiterUser = await this.prisma.user.findUnique({
      where: { id: recruiterId },
    });

    if (!recruiterUser) {
      throw new NotFoundException(`Recruiter user with ID "${recruiterId}" not found`);
    }

    return this.prisma.application.update({
      where: { id },
      data: { recruiterId },
      include: {
        recruiter: {
          select: { id: true, email: true },
        },
      },
    });
  }
}
