import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // 1. Search & View Security Audit Logs (System Admin Only)
  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'View security audit log history (System Admin)' })
  @ApiQuery({ name: 'actorId', required: false, type: String, description: 'Filter by user actor ID' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action (USER_LOGIN, JOB_PUBLISHED)' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Filter by entity type (User, Job, Candidate)' })
  @ApiResponse({ status: 200, description: 'List of security audit logs' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.findAll(actorId, action, entityType);
  }
}
