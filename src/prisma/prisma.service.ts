/**
 * @license GPL-3.0-or-later
 * © 2025 Caleb Gyamfi – Omnixys Technologies
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import 'dotenv/config';

import { env } from '../config/env.js';
import { PrismaClient } from './generated/client.js';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { setupPrismaSpans } from '@omnixys/observability-ts';
import { PrismaPg } from '@prisma/adapter-pg';

const { DATABASE_URL } = env;
// const { DATABASE_URL_LOCALE } = env;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger;

  constructor(logger: OmnixysLogger) {
    const adapter = new PrismaPg({
      // connectionString: DATABASE_URL_LOCALE,
      connectionString: DATABASE_URL,
    });

    super({
      adapter,
      log: [{ emit: 'event', level: 'query' }],
    });
    this.logger = logger.log(this.constructor.name);
  }

  async onModuleInit(): Promise<void> {
    setupPrismaSpans(this);

    await this.$connect();
    this.logger.info('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.info('Database connection closed');
  }
}
