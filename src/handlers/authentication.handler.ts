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

import { UserStateException } from '../user/errors/user.error.js';
import {
  CreateGuestUserDTO,
  RegisterService,
} from '../user/services/register.service.js';
import { UserWriteService } from '../user/services/user-write.service.js';
import { Injectable } from '@nestjs/common';
import { ValkeyKey, ValkeyService } from '@omnixys/cache-ts';
import {
  CreateGuestDTO,
  CreateUserProviderDTO,
  GuestSignUpTokenPayload,
  GuestUserKey,
  SignUpTokenPayload,
  UserActionDTO,
  UserTokenDTO,
} from '@omnixys/contracts-ts';
import { CreateUserInput } from '@omnixys/graphql-ts';
import {
  IKafkaEventContext,
  KafkaEvent,
  KafkaEventHandler,
  KafkaTopics,
} from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';
import { EncryptionService } from '@omnixys/security-ts';

interface SignupVerificationUserCache {
  userData: CreateUserInput;
}

/**
 * Kafka event handler responsible for useristrative commands such as
 * shutdown and restart. It listens for specific user-related topics
 * and delegates the actual process control logic to the {@link UserService}.
 *
 * @category Messaging
 * @since 1.0.0
 */
@KafkaEventHandler('authentication')
@Injectable()
export class AuthenticationHandler {
  private readonly log;

  /**
   * Creates a new instance of {@link UserHandler}.
   *
   * @param loggerService - The central logger service used for structured logging.
   * @param userService - The service responsible for handling system-level user operations.
   */
  constructor(
    private readonly logger: OmnixysLogger,
    private readonly registerService: RegisterService,
    private readonly userWriteService: UserWriteService,
    private readonly cache: ValkeyService,
    private readonly encryptionService: EncryptionService,
  ) {
    this.log = this.logger.log(this.constructor.name, 'service:user');
  }

  @KafkaEvent(KafkaTopics.user.createGuest)
  async handleCreateGuest(
    payload: CreateGuestDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    this.log.debug(
      'Kafka message received: topic=%s | userId=%s | invitationId=%s',
      KafkaTopics.user.createGuest,
      payload.userId,
      payload.invitationId,
    );

    return TraceRunner.run('[HANDLER] createGuest', async () => {
      const { token, userId, keycloakSub, username, email, invitationId } =
        payload;

      this.log.debug(
        'Kafka processing started: topic=%s | userId=%s | invitationId=%s',
        KafkaTopics.user.createGuest,
        userId,
        invitationId,
      );

      try {
        const decrypted = this.encryptionService.decrypt(token, true);
        const { userKey } = JSON.parse(decrypted) as GuestSignUpTokenPayload;

        const raw = await this.cache.get(
          ValkeyKey.guestVerificationUser,
          userKey,
        );
        if (!raw) {
          throw new UserStateException('guest-token-expired');
        }

        const parsed = JSON.parse(raw) as GuestUserKey;

        /**
         * 🔥 IMPORTANT: find correct invitee
         */
        const invitee = parsed.users.find(
          (u) => u.invitationId === invitationId,
        );

        if (!invitee) {
          throw new UserStateException('guest-invitee-not-found');
        }

        const finalInput: CreateGuestUserDTO = {
          userId,
          keycloakSub,
          username,
          email,
          firstName: invitee.firstName,
          lastName: invitee.lastName,
          phoneNumbers: invitee.phoneNumbers,
          actorId: parsed.actorId,
        };

        await this.registerService.createGuest(finalInput);

        this.log.debug(
          'Kafka processing completed: topic=%s | userId=%s | invitationId=%s',
          KafkaTopics.user.createGuest,
          userId,
          invitationId,
        );
      } catch (error) {
        this.log.error(
          'Kafka processing failed: topic=%s | userId=%s | invitationId=%s | error=%o',
          KafkaTopics.user.createGuest,
          userId,
          invitationId,
          error,
        );
        throw error;
      }
    });
  }

  @KafkaEvent(KafkaTopics.user.deleteUser)
  async handleDeleteUser(
    payload: UserActionDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    this.log.debug(
      'Kafka message received: topic=%s | userId=%s',
      KafkaTopics.user.deleteUser,
      payload.userId,
    );
    this.log.debug(
      'Kafka processing started: topic=%s | userId=%s',
      KafkaTopics.user.deleteUser,
      payload.userId,
    );

    try {
      const deleted = await this.userWriteService.delete(payload.userId);

      if (!deleted) {
        this.log.warn(
          'Kafka message ignored: topic=%s | userId=%s | reason=user not found',
          KafkaTopics.user.deleteUser,
          payload.userId,
        );
      }

      this.log.debug(
        'Kafka processing completed: topic=%s | userId=%s',
        KafkaTopics.user.deleteUser,
        payload.userId,
      );
    } catch (error) {
      this.log.error(
        'Kafka processing failed: topic=%s | userId=%s | error=%o',
        KafkaTopics.user.deleteUser,
        payload.userId,
        error,
      );
      throw error;
    }
  }

  @KafkaEvent(KafkaTopics.user.createUser)
  async handleCreateUser(
    payload: UserTokenDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    this.log.debug(
      'Kafka message received: topic=%s | userId=%s',
      KafkaTopics.user.createUser,
      payload.userId,
    );

    return TraceRunner.run('[HANDLER] createUser', async () => {
      const { token, userId, keycloakSub } = payload;

      this.log.debug(
        'Kafka processing started: topic=%s | userId=%s',
        KafkaTopics.user.createUser,
        userId,
      );

      try {
        if (!token) {
          throw new UserStateException('signup-token-missing');
        }

        if (!userId || !keycloakSub) {
          throw new UserStateException('identity-incomplete');
        }

        const decryptedToken = this.encryptionService.decrypt(token, true);
        const { userKey } = JSON.parse(decryptedToken) as SignUpTokenPayload;

        const raw = await this.cache.get(
          ValkeyKey.signupVerificationUser,
          userKey,
        );

        if (!raw) {
          throw new UserStateException('signup-token-expired');
        }

        const parsed = JSON.parse(raw) as SignupVerificationUserCache;
        const input = parsed.userData;

        await this.registerService.create(input, { userId, keycloakSub });

        this.log.debug(
          'Kafka processing completed: topic=%s | userId=%s',
          KafkaTopics.user.createUser,
          userId,
        );
      } catch (error) {
        this.log.error(
          'Kafka processing failed: topic=%s | userId=%s | error=%o',
          KafkaTopics.user.createUser,
          userId,
          error,
        );
        throw error;
      }
    });
  }

  @KafkaEvent(KafkaTopics.user.createProviderUser)
  async handleCreateProviderUser(
    payload: CreateUserProviderDTO,
    _context: IKafkaEventContext,
  ): Promise<void> {
    this.log.debug(
      'Kafka message received: topic=%s | userId=%s',
      KafkaTopics.user.createProviderUser,
      payload.userId,
    );
    this.log.debug(
      'Kafka processing started: topic=%s | userId=%s',
      KafkaTopics.user.createProviderUser,
      payload.userId,
    );

    try {
      if (!payload.userId || !payload.keycloakSub) {
        throw new UserStateException('identity-incomplete');
      }

      await this.registerService.createProviderUser(payload);

      this.log.debug(
        'Kafka processing completed: topic=%s | userId=%s',
        KafkaTopics.user.createProviderUser,
        payload.userId,
      );
    } catch (error) {
      this.log.error(
        'Kafka processing failed: topic=%s | userId=%s | error=%o',
        KafkaTopics.user.createProviderUser,
        payload.userId,
        error,
      );
      throw error;
    }
  }
}
