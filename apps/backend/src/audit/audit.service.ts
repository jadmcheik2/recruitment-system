import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Record Security Audit Log Entry (Section 17 Requirements)
  async log(
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: any,
  ) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          entityType,
          entityId,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (error) {
      console.error('Failed to write audit log entry:', error);
    }
  }

  // 2. Query & Search Audit Logs (System Admin View)
  async findAll(actorId?: string, action?: string, entityType?: string) {
    const where: any = {};

    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, email: true, role: { select: { name: true } } },
        },
      },
    });
  }
}
