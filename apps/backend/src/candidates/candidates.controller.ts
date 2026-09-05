import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CandidatesService } from './candidates.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Candidates')
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  // 1. Search and list candidates (HR Manager & Recruiter)
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('candidate.view')
  @ApiOperation({ summary: 'Search and list candidate profiles (HR / Recruiter)' })
  @ApiQuery({ name: 'skill', required: false, type: String, description: 'Filter candidates by skill' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Optional search keyword' })
  @ApiResponse({ status: 200, description: 'List of candidate profiles' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(
    @Query('search') search?: string,
    @Query('skill') skill?: string,
  ) {
    return this.candidatesService.findAll(search , skill);
  }

  // 2. Get logged-in candidate profile
  // view own profile
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get logged-in user candidate profile' })
  @ApiResponse({ status: 200, description: 'Candidate profile' })
  async getMyProfile(@Req() req: any) {
    return this.candidatesService.findByUserId(req.user.userId);
  }

  // 3. View candidate profile by ID
  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('candidate.view')
  @ApiOperation({ summary: 'View candidate profile by candidate ID' })
  @ApiResponse({ status: 200, description: 'Candidate profile' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  // 4. Update candidate profile (Object-level authorization: candidates update own, or users with candidate.update)
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update candidate profile details (name, phone, skills)' })
  @ApiResponse({ status: 200, description: 'Candidate profile updated' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    const candidate = await this.candidatesService.findOne(id);

    // Object-level authorization check
    const isOwner = candidate.userId === req.user.userId;
    const hasPermission = req.user.permissions?.includes('candidate.update');

    if (!isOwner && !hasPermission) {
      throw new ForbiddenException('You do not have permission to update this candidate profile');
    }

    return this.candidatesService.update(id, dto);
  }

  // 5. Upload Resume (Section 15 Requirements)
  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload candidate resume (PDF, JPG, PNG up to 10MB)' })
  @ApiResponse({ status: 200, description: 'Resume uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadResume(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    const candidate = await this.candidatesService.findOne(id);

    // Object-level authorization check
    const isOwner = candidate.userId === req.user.userId;
    const hasPermission = req.user.permissions?.includes('candidate.update');

    if (!isOwner && !hasPermission) {
      throw new ForbiddenException('You do not have permission to upload resume for this candidate');
    }

    return this.candidatesService.uploadResume(id, file);
  }

  // 6. Secure Resume Download Endpoint (Section 15 & 16 Security Requirements)
  @Get(':id/resume')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Secure resume download URL (Authorized users only)' })
  @ApiResponse({ status: 200, description: 'File stream download' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Resume file not found' })
  async downloadResume(
    @Req() req: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const candidate = await this.candidatesService.findOne(id);

    // Enforce object-level authorization (PDF Section 16 security requirement!)
    const isOwner = candidate.userId === req.user.userId;
    const hasViewPermission = req.user.permissions?.includes('candidate.view');

    if (!isOwner && !hasViewPermission) {
      throw new ForbiddenException("Unauthorized: You cannot access another candidate's private resume");
    }

    const { filePath, fileName } = await this.candidatesService.getResumeFile(id);
    return res.download(filePath, fileName);
  }
}
