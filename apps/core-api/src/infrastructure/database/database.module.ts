// apps/core-api/src/infrastructure/database/database.module.ts
// Source: https://www.prisma.io/docs/guides/frameworks/nestjs
//
// @Global() makes PrismaService available everywhere without needing to
// import DatabaseModule in each feature module — only AppModule needs to import it.

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
