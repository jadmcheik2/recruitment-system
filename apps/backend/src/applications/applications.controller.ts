import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { AssignRecruiterDto } from './dto/assign-recruiter.dto';
import { ApplicationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CandidatesService } from '../candidates/candidates.service';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly candidatesService: CandidatesService,
  ) {}

  // 1. Candidate applies for a job
  @Post('jobs/:jobId/apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Submit a job application (Candidate)' })
  @ApiResponse({ status: 201, description: 'Application submitted successfully' })
  @ApiResponse({ status: 409, description: 'Already applied to this job' })
  async apply(
    @Req() req: any,
    @Param('jobId') jobId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    const candidate = await this.candidatesService.findByUserId(req.user.userId);
    return this.applicationsService.apply(candidate.id, jobId, dto);
  }

  // 2. Search & list applications (HR / Recruiter)
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('application.view')
  @ApiOperation({ summary: 'Search and list applications (HR / Recruiter)' })
  @ApiQuery({ name: 'jobId', required: false, type: String, description: 'ID of the job to apply for' })
  @ApiQuery({ name: 'candidateId', required: false, type: String, description: 'ID of the candidate' })
  @ApiQuery({ name: 'recruiterId', required: false, type: String, description: 'ID of the recruiter' })
  @ApiResponse({ status: 200, description: 'List of job applications' })
  async findAll(
    @Query('jobId') jobId?: string,
    @Query('candidateId') candidateId?: string,
    @Query('recruiterId') recruiterId?: string,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.applicationsService.findAll(jobId, candidateId, recruiterId, status);
  }

  // 3. Get logged-in candidate's submitted applications
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get logged-in candidate submitted applications' })
  @ApiResponse({ status: 200, description: 'List of candidate applications' })
  async getMyApplications(@Req() req: any) {
    const candidate = await this.candidatesService.findByUserId(req.user.userId);
    return this.applicationsService.findAll(undefined, candidate.id);
  }

  // 4. View single application details with full audit timeline
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('application.view')
  @ApiOperation({ summary: 'View single application details with event history log' })
  @ApiResponse({ status: 200, description: 'Application details' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  // 5. Update pipeline stage status (Section 5 Hiring Pipeline Workflow)
  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('application.update_status')
  @ApiOperation({ summary: 'Advance candidate pipeline stage (APPLIED -> SCREENING -> INTERVIEW -> SELECTED/REJECTED)' })
  @ApiResponse({ status: 200, description: 'Pipeline status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, req.user.userId, dto);
  }

  // 6. Assign Recruiter to Application
  @Patch(':id/assign')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('application.assign')
  @ApiOperation({ summary: 'Assign a recruiter to manage an application' })
  @ApiResponse({ status: 200, description: 'Recruiter assigned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async assignRecruiter(
    @Param('id') id: string,
    @Body() dto: AssignRecruiterDto,
  ) {
    return this.applicationsService.assignRecruiter(id, dto.recruiterId);
  }
}
