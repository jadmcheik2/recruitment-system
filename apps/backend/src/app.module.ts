import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { ApplicationsModule } from './applications/applications.module';
import { InterviewsModule } from './interviews/interviews.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { AuditModule } from './audit/audit.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuditModule,
    NotificationsModule,
    AuthModule,
    JobsModule,
    CandidatesModule,
    ApplicationsModule,
    InterviewsModule,
    DashboardsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
