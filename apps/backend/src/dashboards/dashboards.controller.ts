import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Dashboards')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  // 1. HR Manager High-Level Dashboard
  @Get('hr')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('application.view')
  @ApiOperation({ summary: 'Get HR Manager high-level recruitment analytics dashboard' })
  @ApiResponse({ status: 200, description: 'HR Manager analytics overview' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getHrDashboard() {
    return this.dashboardsService.getHrDashboard();
  }

  // 2. Recruiter Operational Dashboard
  @Get('recruiter')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('application.view')
  @ApiOperation({ summary: 'Get logged-in recruiter assigned pipeline dashboard' })
  @ApiResponse({ status: 200, description: 'Recruiter assigned application metrics' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getRecruiterDashboard(@Req() req: any) {
    return this.dashboardsService.getRecruiterDashboard(req.user.userId);
  }

  // 3. Candidate / Applicant Self-Service Dashboard
  @Get('applicant')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get logged-in applicant application status & interview dashboard' })
  @ApiResponse({ status: 200, description: 'Candidate application summary' })
  async getApplicantDashboard(@Req() req: any) {
    return this.dashboardsService.getApplicantDashboard(req.user.userId);
  }
}
