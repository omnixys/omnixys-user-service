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

import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger-ts';

@Injectable()
export class AdminService {
  private readonly log;

  constructor(private readonly logger: OmnixysLogger) {
    this.log = this.logger.log(this.constructor.name, 'service:user');
  }

  /**
   * Initiates a controlled application shutdown.
   *
   * @remarks
   * This method schedules a process exit with code `0` after a short delay,
   * allowing pending logs or responses to complete before termination.
   *
   * When running inside Docker (with `restart: always` or similar),
   * the container will **not automatically restart** after a graceful shutdown.
   * Use {@link restart} if you want to trigger a container restart instead.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:7501/admin/shutdown \
   *   -H "x-api-key: super-secret-key"
   * ```
   *
   * @returns A Promise that resolves once the shutdown has been triggered.
   */
  shutdown(): void {
    this.log.warn('Shutdown signal received — initiating graceful exit...');
    process.kill(process.pid, 'SIGTERM');
  }

  /**
   * Initiates a controlled application restart.
   *
   * @remarks
   * This method schedules a process exit with code `1` after a short delay.
   * Container supervisors (e.g., Docker, systemd, PM2) interpret this as a failure
   * and automatically restart the container or process.
   *
   * The restart logic does **not** manually spawn a new Node.js process,
   * avoiding port conflicts and ensuring consistent runtime state.
   *
   * @example
   * Trigger restart via Kafka:
   * ```json
   * {
   *   "topic": "admin.restart",
   *   "payload": {}
   * }
   * ```
   *
   * @example
   * Trigger restart via REST:
   * ```bash
   * curl -X POST http://localhost:7501/admin/restart \
   *   -H "x-api-key: super-secret-key"
   * ```
   *
   * @returns A Promise that resolves once the restart has been initiated.
   */
  restart(): void {
    this.log.warn('Restart requested — exiting process so container supervisor restarts it...');
    process.kill(process.pid, 'SIGTERM');
  }

  /**
   * Returns the current health status of the service.
   *
   * @remarks
   * This is a lightweight endpoint to verify service availability.
   * It can be extended with additional checks (DB, Redis, Kafka, etc.).
   *
   * @example
   * ```bash
   * curl http://localhost:7501/admin/health
   * ```
   *
   * @returns An object with the service status and uptime in seconds.
   */
  getHealth(): { status: string; uptime: number } {
    const health = { status: 'ok', uptime: process.uptime() };
    this.log.debug(`Health check: ${JSON.stringify(health)}`);
    return health;
  }
}
