/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { type User } from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserStateException } from '../errors/user.error.js';
import { Injectable } from '@nestjs/common';
import {
  PhoneNumberDTO,
  StatusType,
  UserType,
  UserProjectionChangedDTO,
} from '@omnixys/contracts-ts';
import { CreateUserInput } from '@omnixys/graphql-ts';
import { KafkaProducerService, KafkaTopics } from '@omnixys/kafka-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import { TraceRunner } from '@omnixys/observability-ts';

export interface CreateGuestUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumbers?: PhoneNumberDTO[];
  actorId: string;
  userId: string;
  keycloakSub: string;
  username: string;
}

@Injectable()
export class RegisterService {
  private readonly log;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly logger: OmnixysLogger,
  ) {
    this.log = this.logger.log(this.constructor.name, 'service:user');
  }

  async create(
    input: CreateUserInput,
    identity: { userId: string; keycloakSub: string },
  ): Promise<User> {
    return TraceRunner.run('Create User', async () => {
      this.log.info(
        'User creation started: userId=%s keycloakSub=%s',
        identity.userId,
        identity.keycloakSub,
      );
      this.log.debug('Creating user in database: userId=%s', identity.userId);

      if (!identity.userId || !identity.keycloakSub) {
        throw new UserStateException('identity-incomplete');
      }
      const { userId, keycloakSub } = identity;

      const createdUser = await this.prisma.$transaction(async (tx) => {
        /* ------------------------------------------------------------
         * 1. User (technical root)
         * ------------------------------------------------------------ */
        const user = await tx.user.create({
          data: {
            id: userId,
            keycloakSub,
            username: input.username,
            userType: input.userType,
            status: StatusType.ACTIVE,
          },
        });

        /* ------------------------------------------------------------
         * 2. PersonalInfo
         * ------------------------------------------------------------ */
        await tx.personalInfo.create({
          data: {
            id: userId,
            email: input.personalInfo.email,
            firstName: input.personalInfo.firstName,
            lastName: input.personalInfo.lastName,
            birthDate: input.personalInfo.birthDate,
            gender: input.personalInfo.gender,
            maritalStatus: input.personalInfo.maritalStatus,

            phoneNumbers: {
              create:
                input.phoneNumbers?.map((p) => ({
                  number: p.number,
                  type: p.type,
                  label: p.label,
                  isPrimary: p.isPrimary ?? false,
                  countryCode: p.countryCode,
                })) ?? [],
            },
          },
        });

        /* ------------------------------------------------------------
         * 5. Customer OR Employee (exclusive)
         * ------------------------------------------------------------ */
        if (input.userType === UserType.CUSTOMER && input.customer) {
          await tx.customer.create({
            data: {
              id: userId,
              subscribed: input.customer.subscribed,
              state: input.customer.state ?? StatusType.ACTIVE,
              contactOptions: input.customer.contactOptions,

              customerInterests: {
                createMany: {
                  data: (input.customer.interestIds ?? []).map((interestId) => ({
                    interestId,
                  })),
                },
              },
            },
          });
        }

        if (input.userType === UserType.EMPLOYEE && input.employee) {
          await tx.employee.create({
            data: {
              id: userId,
              department: input.employee.department,
              position: input.employee.position,
              role: input.employee.role,
              salary: input.employee.salary,
              hireDate: input.employee.hireDate,
              isExternal: input.employee.isExternal,
            },
          });
        }

        /* ------------------------------------------------------------
         * 7. Contacts (optional)
         * ------------------------------------------------------------ */
        if (input.contacts?.length) {
          await tx.contact.createMany({
            data: input.contacts.map((c) => ({
              userId,
              contactId: c.contactId,
              relationship: c.relationship,
              withdrawalLimit: c.withdrawalLimit ?? 0,
              emergency: c.emergency ?? false,
              startDate: c.startDate,
              endDate: c.endDate,
            })),
          });
        }

        // void this.kafkaProducerService.send<
        //   typeof KafkaTopics.notification.createUser
        //   >(
        // KafkaTopics.notification.createUser,
        //   {
        //     username: user.username,
        //     firstName: personalInfo.firstName,
        //     lastName: personalInfo.lastName,
        //     email: personalInfo.email,
        //   },
        //   'user-service',
        //   {
        //     traceId: sc.traceId,
        //     spanId: sc.spanId,
        //   },
        // );

        return user;
      });

      this.log.debug('Database user creation completed: userId=%s', userId);
      this.log.info('User creation completed: userId=%s', userId);

      void this.emitProjectionChanged(userId);

      return createdUser;
    });
  }

  async createProviderUser(input: {
    userId: string;
    keycloakSub: string;
    email?: string;
    username?: string;
  }): Promise<void> {
    this.log.info('Provider user creation started: userId=%s', input.userId);

    if (!input.userId || !input.keycloakSub) {
      throw new UserStateException('identity-incomplete');
    }
    const { userId, keycloakSub } = input;

    await this.prisma.$transaction(async (tx) => {
      /* ------------------------------------------------------------
       * 1. User (technical root)
       * ------------------------------------------------------------ */
      await tx.user.create({
        data: {
          id: userId,
          keycloakSub,
          username: input.username ?? input.email ?? '',
          userType: UserType.CUSTOMER,
          status: 'ACTIVE',
        },
      });
    });

    this.log.debug('Database provider user creation completed: userId=%s', userId);
    this.log.info('Provider user creation completed: userId=%s', userId);

    void this.emitProjectionChanged(userId);
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    return TraceRunner.run('isUsernameAvailable', async () => {
      this.log.debug('Checking username availability: %s', username);

      const user = await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (user) {
        this.log.error('Username already exists: %s', username);
        return false;
      }

      this.log.debug('Username availability check completed: available=true');
      return true;
    });
  }

  async checkEmail(email: string): Promise<boolean> {
    this.log.debug('Checking email availability');

    const user = await this.prisma.user.findFirst({
      where: {
        personalInfo: {
          email,
        },
      },
      select: { id: true },
    });

    this.log.debug('Email availability check completed: available=%s', !user);
    return !user;
  }

  async createGuest(input: CreateGuestUserDTO) {
    return TraceRunner.run('[SERVICE] createGuest', async () => {
      const { userId, keycloakSub, username, email, firstName, lastName, phoneNumbers } = input;

      this.log.info('Guest user creation started: userId=%s', userId);

      if (!userId || !keycloakSub) {
        throw new UserStateException('identity-incomplete');
      }

      const createdGuest = await this.prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: userId,
            keycloakSub,
            username,
            userType: UserType.GUEST,
            status: StatusType.ACTIVE,
          },
        });

        await tx.personalInfo.create({
          data: {
            id: userId,
            email,
            firstName,
            lastName,

            phoneNumbers: {
              create:
                phoneNumbers?.map((p) => ({
                  number: p.number,
                  type: p.type,
                  label: p.label,
                  isPrimary: p.isPrimary ?? false,
                  countryCode: p.countryCode,
                })) ?? [],
            },
          },
        });
      });

      this.log.debug('Database guest user creation completed: userId=%s', userId);
      this.log.info('Guest user creation completed: userId=%s', userId);

      void this.emitProjectionChanged(userId);

      return createdGuest;
    });
  }

  private async emitProjectionChanged(userId: string): Promise<void> {
    try {
      const personalInfo = await this.prisma.personalInfo.findUnique({ where: { id: userId } });
      if (!personalInfo) {
        return;
      }
      const phoneNumbers = await this.prisma.phoneNumber.findMany({
        where: { infoId: userId },
      });
      const primaryPhone =
        phoneNumbers.find((p) => p.isPrimary)?.number ?? phoneNumbers[0]?.number ?? null;

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return;
      }

      const payload: UserProjectionChangedDTO = {
        id: userId,
        username: user.username,
        displayName:
          [personalInfo.firstName, personalInfo.lastName].filter(Boolean).join(' ') || null,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        email: personalInfo.email,
        primaryPhone,
        avatarUrl: null,
        locale: null,
      };

      await this.kafkaProducerService.send(
        KafkaTopics.user.changedProjection,
        payload,
        'user-service',
      );
    } catch (error) {
      this.log.error('Failed to emit projection changed event', { userId, error });
    }
  }
}
