import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Global validation pipe using class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global REST API prefix
  app.setGlobalPrefix('api');

  // Configure Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Internal Recruitment Management System API')
    .setDescription('REST API for managing job vacancies, candidate applications, recruiter workflows, and dynamic RBAC roles.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 NestJS Backend API is running on http://localhost:${port}/api`);
  console.log(`📚 Swagger Interactive API Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
