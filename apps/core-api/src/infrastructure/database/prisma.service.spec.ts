// apps/core-api/src/infrastructure/database/prisma.service.spec.ts
//
// Integration smoke test for PrismaService.
//
// NOTE: This test requires a live PostgreSQL database (DATABASE_URL env var set).
// It will FAIL outside Docker — this is expected and documented.
// Run inside container: docker compose exec core-api npm test -- --testPathPattern=prisma.service
//
// Source: @nestjs/testing documentation, VALIDATION.md Wave 0 requirements

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    // onModuleInit calls $connect() — will throw if postgres is unreachable
    await expect(service.onModuleInit()).resolves.not.toThrow();
  });
});
