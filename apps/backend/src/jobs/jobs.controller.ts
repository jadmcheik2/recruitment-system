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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // 1. Create a new Job Draft
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('job.create')
  @ApiOperation({ summary: 'Create a new job posting in DRAFT status (HR Manager)' })
  @ApiResponse({ status: 201, description: 'Job successfully created' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Req() req: any, @Body() dto: CreateJobDto) {
    return this.jobsService.create(req.user.userId, dto);
  }

  // 2. Search / List jobs
  @Get()
  @ApiOperation({ summary: 'Search and list jobs with optional status/search filters' })
  @ApiResponse({ status: 200, description: 'List of jobs' })
  async findAll(
    @Query('status') status?: JobStatus,
    @Query('search') search?: string,
  ) {
    return this.jobsService.findAll(status, search);
  }

  // 3. View single job details
  @Get(':id')
  @ApiOperation({ summary: 'View job posting details by ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  // 4. Update job details
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('job.update')
  @ApiOperation({ summary: 'Update job details (HR Manager)' })
  @ApiResponse({ status: 200, description: 'Job updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  // 5. Publish job (DRAFT -> PUBLISHED)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('job.publish')
  @ApiOperation({ summary: 'Publish job draft to PUBLISHED status (HR Manager)' })
  @ApiResponse({ status: 200, description: 'Job published' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async publish(@Param('id') id: string) {
    return this.jobsService.publish(id);
  }

  // 6. Close job (PUBLISHED -> CLOSED)
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('job.update')
  @ApiOperation({ summary: 'Close job posting to CLOSED status' })
  @ApiResponse({ status: 200, description: 'Job closed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async close(@Param('id') id: string) {
    return this.jobsService.close(id);
  }
}
