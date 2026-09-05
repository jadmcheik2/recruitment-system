import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus, InterviewStatus, JobStatus } from '@prisma/client';
import { CandidatesService } from '../candidates/candidates.service';

@Injectable()
export class DashboardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
  ) {}

  // 1. HR Manager High-Level Dashboard Analytics (Section 3 of PDF)
  async getHrDashboard() {
    const totalJobs = await this.prisma.job.count();
    const activeJobs = await this.prisma.job.count({
      where: { status: JobStatus.PUBLISHED },
    });
    const totalApplications = await this.prisma.application.count();

    // Group applications by status stage
    const statusCounts = await this.prisma.application.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const applicationsByStatus = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      SELECTED: 0,
      REJECTED: 0,
    };

    statusCounts.forEach((item) => {
      applicationsByStatus[item.status] = item._count.status;
    });

    // Calculate Hire Rate percentage
    const selectedCount = applicationsByStatus.SELECTED;
    const hireRatePercentage =
      totalApplications > 0
        ? Math.round((selectedCount / totalApplications) * 100)
        : 0;

    return {
      overview: {
        totalJobs,
        activeJobs,
        totalApplications,
        hireRatePercentage: `${hireRatePercentage}%`,
      },
      applicationsByStatus,
      recentApplications: await this.prisma.application.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          job: { select: { id: true, title: true } },
          candidate: { select: { id: true, name: true } },
          events: {
            take: 1,
          },
        },
      }),
    };
  }

  // 2. Recruiter Operational Dashboard
  async getRecruiterDashboard(recruiterId: string) {
    const assignedApplicationsCount = await this.prisma.application.count({
      where: { recruiterId },
    });

    const pendingScreeningsCount = await this.prisma.application.count({
      where: {
        recruiterId,
        status: {
          in: [ApplicationStatus.APPLIED, ApplicationStatus.SCREENING],
        },
      },
    });

    const upcomingInterviewsCount = await this.prisma.interview.count({
      where: {
        interviewerId: recruiterId,
        status: InterviewStatus.SCHEDULED,
      },
    });

    const assignedApplications = await this.prisma.application.findMany({
      where: { recruiterId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, location: true } },
        candidate: { select: { id: true, name: true, phone: true } },
      },
    });

    return {
      overview: {
        assignedApplicationsCount,
        pendingScreeningsCount,
        upcomingInterviewsCount,
      },
      assignedApplications,
    };
  }

  // 3. Candidate / Applicant Self-Service Dashboard
  async getApplicantDashboard(userId: string) {
    const candidate = await this.candidatesService.findByUserId(userId);

    const totalApplicationsCount = await this.prisma.application.count({
      where: { candidateId: candidate.id },
    });

    const activeApplicationsCount = await this.prisma.application.count({
      where: {
        candidateId: candidate.id,
        status: {
          notIn: [ApplicationStatus.REJECTED, ApplicationStatus.SELECTED],
        },
      },
    });

    const myApplications = await this.prisma.application.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: { id: true, title: true, location: true, type: true },
        },
        events: {
          take: 1,
        },
      },
    });

    const upcomingInterviews = await this.prisma.interview.findMany({
      where: {
        application: { candidateId: candidate.id },
        status: InterviewStatus.SCHEDULED,
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          include: { job: { select: { id: true, title: true } } },
        },
      },
    });

    return {
      candidateProfile: {
        id: candidate.id,
        name: candidate.name,
        hasResume: !!candidate.resumeKey,
      },
      overview: {
        totalApplicationsCount,
        activeApplicationsCount,
        upcomingInterviewsCount: upcomingInterviews.length,
      },
      myApplications,
      upcomingInterviews,
    };
  }
}
