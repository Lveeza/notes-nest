import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;


constructor(config: ConfigService) {
  const adapter = new PrismaBetterSqlite3({ url: config.getOrThrow<string>('DATABASE_URL') });
  this.client = new PrismaClient({ adapter });
}

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}