/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2025 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { ValkeyAdapterModule } from './adapter/valkey-adapter.module.js';
import { AdminModule } from './admin/admin.module.js';
import { BannerService } from './banner.service.js';
import { env } from './config/env.js';
import { HandlerModule } from './handlers/handler.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UserModule } from './user/user.module.js';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ValkeyModule } from '@omnixys/cache';
import { ContextModule } from '@omnixys/context';
import { OmnixysGraphQLModule } from '@omnixys/graphql';
import { OmnixysHttpModule } from '@omnixys/http';
import { KafkaModule } from '@omnixys/kafka';
import { LoggerModule } from '@omnixys/logger';
import { ObservabilityModule } from '@omnixys/observability';
import { SecurityModule } from '@omnixys/security';

const {
  SCHEMA_TARGET,
  SERVICE,
  KAFKA_BROKER,
  TEMPO_URI,
  VALKEY_URL,
  VALKEY_PASSWORD,
  KC_URL,
  KC_REALM,
  ENCRYPTION_KEY,
} = env;

@Module({
  imports: [
    ContextModule.forRoot(),
    OmnixysHttpModule.forRoot({ serviceName: SERVICE }),
    SecurityModule.forRoot({
      jwt: {
        issuer: `${KC_URL}/realms/${KC_REALM}`,
        jwksUri: `${KC_URL}/realms/${KC_REALM}/protocol/openid-connect/certs`,
      },

      rateLimit: {
        enabled: true,
        defaultLimit: 100,
        defaultWindowMs: 60000,
        imports: [ValkeyAdapterModule],
      },

      hash: {
        encryptionKey: ENCRYPTION_KEY,
      },
    }),

    ValkeyModule.forRoot({
      serviceName: SERVICE,
      url: VALKEY_URL,
      password: VALKEY_PASSWORD,

      pubSub: { enabled: true },
      streams: { enabled: true },
    }),

    OmnixysGraphQLModule.forRoot({
      autoSchemaFile:
        SCHEMA_TARGET === 'tmp'
          ? { path: '/tmp/schema.gql', federation: 2 }
          : SCHEMA_TARGET === 'false'
            ? false
            : { path: 'dist/schema.gql', federation: 2 },
      sortSchema: true,
    }),

    KafkaModule.forRoot({
      clientId: SERVICE,
      brokers: [KAFKA_BROKER],
      groupId: `${SERVICE}-group`,
      serviceName: SERVICE,
    }),

    ObservabilityModule.forRoot({
      serviceName: SERVICE,

      otel: {
        endpoint: TEMPO_URI,
        transport: 'http',
        samplingRatio: 1,
      },

      metrics: {
        port: 9464,
        enabled: true,
      },
    }),

    LoggerModule.forRoot({
      serviceName: SERVICE,
      registerGlobalInterceptor: true,

      batch: {
        enabled: true,
        maxSize: 50,
        flushInterval: 2000,
      },
    }),
    AdminModule,
    HandlerModule,
    HealthModule,
    UserModule,
    PrismaModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [],
  providers: [BannerService],
})
export class AppModule {}
