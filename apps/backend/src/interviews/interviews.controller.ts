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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { InterviewStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  // 1. Schedule an interview
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('interview.schedule')
  @ApiOperation({ summary: 'Schedule a new candidate interview (Recruiter / HR)' })
  @ApiResponse({ status: 201, description: 'Interview scheduled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(dto);
  }

  // 2. Search & list interviews
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('interview.view')
  @ApiOperation({ summary: 'Search and list interviews (Recruiter / Interviewer)' })
  @ApiResponse({ status: 200, description: 'List of scheduled interviews' })
  async findAll(
    @Query('applicationId') applicationId?: string,
    @Query('interviewerId') interviewerId?: string,
    @Query('status') status?: InterviewStatus,
  ) {
    return this.interviewsService.findAll(applicationId, interviewerId, status);
  }

  // 3. View single interview details
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('interview.view')
  @ApiOperation({ summary: 'View interview details by ID' })
  @ApiResponse({ status: 200, description: 'Interview details' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async findOne(@Param('id') id: string) {
    return this.interviewsService.findOne(id);
  }

  // 4. Update interview feedback notes and status (COMPLETED, CANCELLED, NO_SHOW)
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('interview.evaluate')
  @ApiOperation({ summary: 'Update interview status and evaluation notes (Interviewer)' })
  @ApiResponse({ status: 200, description: 'Interview updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewsService.update(id, dto);
  }
}
