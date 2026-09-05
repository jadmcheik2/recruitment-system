import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { ApplicationStatus, InterviewStatus } from '@prisma/client';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Schedule a new interview
  async create(dto: CreateInterviewDto) {
    // Verify application exists
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID "${dto.applicationId}" not found`);
    }

    // Verify interviewer user exists
    const interviewerUser = await this.prisma.user.findUnique({
      where: { id: dto.interviewerId },
    });

    if (!interviewerUser) {
      throw new NotFoundException(`Interviewer user with ID "${dto.interviewerId}" not found`);
    }

    // Create interview and automatically advance application to INTERVIEW stage in transaction
    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          applicationId: dto.applicationId,
          interviewerId: dto.interviewerId,
          scheduledAt: new Date(dto.scheduledAt),
          notes: dto.notes,
          status: InterviewStatus.SCHEDULED,
        },
        include: {
          application: {
            include: {
              job: true,
              candidate: true,
            },
          },
          interviewer: {
            select: { id: true, email: true },
          },
        },
      });

      // Update application status to INTERVIEW stage if currently in APPLIED or SCREENING
      if (
        application.status === ApplicationStatus.APPLIED ||
        application.status === ApplicationStatus.SCREENING
      ) {
        await tx.application.update({
          where: { id: dto.applicationId },
          data: { status: ApplicationStatus.INTERVIEW },
        });

        // Log pipeline event
        await tx.applicationEvent.create({
          data: {
            application: { connect: { id: dto.applicationId } },
            fromStatus: application.status,
            toStatus: ApplicationStatus.INTERVIEW,
            changer: { connect: { id: dto.interviewerId } },
          },
        });
      }

      return interview;
    });
  }

  // 2. Search & list interviews
  async findAll(
    applicationId?: string,
    interviewerId?: string,
    status?: InterviewStatus,
  ) {
    const where: any = {};

    if (applicationId) where.applicationId = applicationId;
    if (interviewerId) where.interviewerId = interviewerId;
    if (status) where.status = status;

    return this.prisma.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          include: {
            job: true,
            candidate: true,
          },
        },
        interviewer: {
          select: { id: true, email: true },
        },
      },
    });
  }

  // 3. Find single interview by ID
  async findOne(id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            job: true,
            candidate: {
              include: {
                user: {
                  select: { id: true, email: true },
                },
              },
            },
          },
        },
        interviewer: {
          select: { id: true, email: true },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException(`Interview with ID "${id}" not found`);
    }

    return interview;
  }

  // 4. Update interview notes and status (SCHEDULED -> COMPLETED, CANCELLED, NO_SHOW)
  async update(id: string, dto: UpdateInterviewDto) {
    await this.findOne(id); // Throws NotFoundException if not found

    return this.prisma.interview.update({
      where: { id },
      data: dto,
      include: {
        application: {
          include: {
            job: true,
            candidate: true,
          },
        },
        interviewer: {
          select: { id: true, email: true },
        },
      },
    });
  }
}
