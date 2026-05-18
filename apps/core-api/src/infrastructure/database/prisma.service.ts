// apps/core-api/src/infrastructure/database/prisma.service.ts
// Source: https://www.prisma.io/docs/guides/frameworks/nestjs
//         https://mgregersen.dk/upgrading-prisma-to-rust-free-client-in-nestjs/
//
// CRITICAL — Prisma 7 breaking changes implemented here:
//   1. PrismaClient imported from generated output path, NOT from '@prisma/client'
//   2. PrismaClient always instantiated with { adapter } — bare super() throws at startup
//   3. PrismaPg driver adapter required for PostgreSQL connectivity

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
