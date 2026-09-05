import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed');

  // 1. Create Permissions
  const permissionsData = [
    { key: 'job.create', description: 'Create job draft' },
    { key: 'job.update', description: 'Update job details' },
    { key: 'job.publish', description: 'Publish job opening' },
    { key: 'candidate.view', description: 'View candidate profile' },
    { key: 'candidate.update', description: 'Update candidate profile' },
    { key: 'application.view', description: 'View applications' },
    { key: 'application.update_status', description: 'Update application pipeline status' },
    { key: 'application.assign', description: 'Assign recruiter to application' },
    { key: 'interview.schedule', description: 'Schedule candidate interviews' },
    { key: 'interview.view', description: 'View scheduled interviews' },
    { key: 'interview.evaluate', description: 'Evaluate candidate interviews' },
    { key: 'audit.view', description: 'View audit logs' },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionsData) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: {},
      create: p,
    });
    permissions[p.key] = perm.id;
  }
  console.log('Permissions created');

  // 2. Create Roles
  const rolesData = [
    { name: 'System Admin' },
    { name: 'HR Manager' },
    { name: 'Recruiter' },
    { name: 'Applicant' },
    { name: 'Interviewer' },
  ];

  const roles: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
    roles[r.name] = role.id;
  }
  console.log('Roles created');

  // 3. Map Permissions to Roles in role_permissions
  const rolePermissionMappings: Record<string, string[]> = {
    'System Admin': Object.keys(permissions), // Admin gets all permissions
    'HR Manager': [
      'job.create',
      'job.update',
      'job.publish',
      'candidate.view',
      'application.view',
      'application.update_status',
      'application.assign',
      'interview.schedule',
      'interview.view',
      'interview.evaluate',
    ],
    'Recruiter': [
      'candidate.view',
      'candidate.update',
      'application.view',
      'application.update_status',
      'interview.schedule',
      'interview.view',
      'interview.evaluate',
    ],
    'Applicant': ['candidate.update', 'application.view'],
    'Interviewer': ['candidate.view', 'application.view', 'interview.view', 'interview.evaluate'],
  };

  for (const [roleName, permKeys] of Object.entries(rolePermissionMappings)) {
    const roleId = roles[roleName];
    for (const key of permKeys) {
      const permissionId = permissions[key];
      if (roleId && permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId, permissionId },
          },
          update: {},
          create: { roleId, permissionId },
        });
      }
    }
  }
  console.log('Role-Permission mappings created');

  // 4. Create Default Admin User Account strictly requiring environment variables
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminEmail || !rawAdminPassword) {
    throw new Error('Missing INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD in .env file!');
  }

  const adminPasswordHash = await bcrypt.hash(rawAdminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      roleId: roles['System Admin'],
      status: UserStatus.ACTIVE,
    },
  });
  console.log(`Default Admin user created: ${adminEmail} (ID: ${adminUser.id})`);

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
