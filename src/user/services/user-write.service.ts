/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from '../../prisma/generated/client.js';
import { AnalyticsOutboxService } from '../../analytics/analytics-outbox.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserNotFoundException } from '../errors/user.error.js';
import { Injectable } from '@nestjs/common';
import {
  GenderType,
  MaritalStatusType,
  StatusType,
  UserProjectionChangedDTO,
} from '@omnixys/contracts';
import { AddContactInput, PhoneNumberInput, UpdateUserInput } from '@omnixys/graphql';
import { KafkaProducerService, KafkaTopics } from '@omnixys/kafka';
import { OmnixysLogger } from '@omnixys/logger';

export interface AddPhoneNumbersDTO {
  userId: string;
  phoneNumbers: PhoneNumberInput[];
}

export interface RemovePhoneNumbersDTO {
  userId: string;
  ids: string[];
}

@Injectable()
export class UserWriteService {
  private readonly log;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly logger: OmnixysLogger,
    private readonly analyticsOutbox: AnalyticsOutboxService,
  ) {
    this.log = this.logger.log(this.constructor.name);
  }

  /* ------------------------------------------------------------------
   * Update technical user data
   * ------------------------------------------------------------------ */
  async update(input: UpdateUserInput): Promise<User> {
    const { id, ...patch } = input;

    this.log.info('User update started: userId=%s', id);
    this.log.debug('Looking up user before update: userId=%s', id);
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      this.log.warn('User update failed: userId=%s | reason=user not found', id);
      throw new UserNotFoundException(id);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          status: patch.status,
          userType: patch.userType ?? undefined,
        },
      });
      await this.enqueueProfileUpdated(tx, id, 'account', patch);
      return result;
    });

    this.log.debug('Database user update completed: userId=%s', id);
    this.log.info('User update completed: userId=%s | status=%s', id, user.status);
    return user;
  }

  /* ------------------------------------------------------------------
   * Delete user
   * ------------------------------------------------------------------ */
  async delete(id: string): Promise<boolean> {
    this.log.info('User deletion started: userId=%s', id);
    this.log.debug('Looking up user before deletion: userId=%s', id);
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) {
      this.log.warn('User deletion ignored: userId=%s | reason=user not found', id);
      return false;
    }

    await this.prisma.user.delete({ where: { id } });
    this.log.debug('Database user deletion completed: userId=%s', id);

    // void this.kafkaProducerService.deleteInvitations(
    //   { guestId: id },
    //   'user.write-service',
    //   {
    //     traceId: sc.traceId,
    //     spanId: sc.spanId,
    //   },
    // );

    // void this.kafkaProducerService.deleteTickets(
    //   { guestId: id },
    //   'user.write-service',
    //   {
    //     traceId: sc.traceId,
    //     spanId: sc.spanId,
    //   },
    // );

    this.log.info('User deletion completed: userId=%s', id);
    return true;
  }

  /* ------------------------------------------------------------------
   * Phone numbers (via PersonalInfo)
   * ------------------------------------------------------------------ */
  async addPhoneNumber(input: AddPhoneNumbersDTO): Promise<void> {
    const { userId, phoneNumbers } = input;

    this.log.debug(
      'Adding phone numbers in database: userId=%s | count=%d',
      userId,
      phoneNumbers.length,
    );
    await this.prisma.personalInfo.update({
      where: { id: userId },
      data: {
        phoneNumbers: {
          create: phoneNumbers.map((p) => ({
            number: p.number,
            type: p.type,
            countryCode: p.countryCode,
            label: p.label,
            isPrimary: p.isPrimary,
          })),
        },
      },
    });
    this.log.info(
      'Phone number addition completed: userId=%s | count=%d',
      userId,
      phoneNumbers.length,
    );
  }

  async removePhoneNumber(input: RemovePhoneNumbersDTO): Promise<void> {
    const { userId, ids } = input;

    this.log.debug(
      'Removing phone numbers from database: userId=%s | count=%d',
      userId,
      ids.length,
    );
    await this.prisma.phoneNumber.deleteMany({
      where: {
        id: { in: ids },
        infoId: userId,
      },
    });
    this.log.info('Phone number removal completed: userId=%s | count=%d', userId, ids.length);
  }

  async addContact(input: AddContactInput): Promise<void> {
    this.log.debug(
      'Adding contact in database: userId=%s | contactId=%s',
      input.userId,
      input.Contact.contactId,
    );
    await this.prisma.contact.create({
      data: {
        userId: input.userId,
        contactId: input.Contact.contactId,
        relationship: input.Contact.relationship,
        withdrawalLimit: input.Contact.withdrawalLimit ?? 0,
        emergency: input.Contact.emergency ?? false,
        startDate: input.Contact.startDate,
        endDate: input.Contact.endDate,
      },
    });
    this.log.info(
      'Contact addition completed: userId=%s | contactId=%s',
      input.userId,
      input.Contact.contactId,
    );
  }

  async removeContact(userId: string, contactId: string): Promise<void> {
    this.log.debug('Removing contact from database: userId=%s | contactId=%s', userId, contactId);
    await this.prisma.contact.delete({
      where: {
        userId_contactId: {
          userId,
          contactId,
        },
      },
    });
    this.log.info('Contact removal completed: userId=%s | contactId=%s', userId, contactId);
  }

  async updatePersonalInfo(
    userId: string,
    patch: {
      email?: string;
      firstName?: string;
      lastName?: string;
      birthDate?: Date;
      gender?: GenderType;
      maritalStatus?: MaritalStatusType;
    },
  ): Promise<void> {
    this.log.debug('Updating personal info in database: userId=%s', userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.personalInfo.update({
        where: { id: userId },
        data: {
          email: patch.email ?? undefined,
          firstName: patch.firstName ?? undefined,
          lastName: patch.lastName ?? undefined,
          birthDate: patch.birthDate ?? undefined,
          gender: patch.gender ?? undefined,
          maritalStatus: patch.maritalStatus ?? undefined,
        },
      });
      await this.enqueueProfileUpdated(tx, userId, 'personal', patch);
    });
    this.log.info('Personal info update completed: userId=%s', userId);

    void this.emitProjectionChanged(userId);
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

  async updateCustomer(
    userId: string,
    patch: {
      subscribed?: boolean;
      maritalStatus?: MaritalStatusType;
      state?: StatusType;
      interests?: any[];
      contactOptions?: any[];
    },
  ): Promise<void> {
    this.log.debug('Updating customer profile in database: userId=%s', userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: userId },
        data: {
          subscribed: patch.subscribed ?? undefined,
          state: patch.state ?? undefined,
          contactOptions: patch.contactOptions ?? undefined,
        },
      });
      await this.enqueueProfileUpdated(tx, userId, 'customer', patch);
    });
    this.log.info('Customer profile update completed: userId=%s', userId);
  }

  async updateEmployee(
    userId: string,
    patch: {
      department?: string;
      position?: string;
      role?: string;
      salary?: number;
      hireDate?: Date;
      isExternal?: boolean;
    },
  ): Promise<void> {
    this.log.debug('Updating employee profile in database: userId=%s', userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: userId },
        data: {
          department: patch.department ?? undefined,
          position: patch.position ?? undefined,
          role: patch.role ?? undefined,
          salary: patch.salary ?? undefined,
          hireDate: patch.hireDate ?? undefined,
          isExternal: patch.isExternal ?? undefined,
        },
      });
      await this.enqueueProfileUpdated(tx, userId, 'employee', patch);
    });
    this.log.info('Employee profile update completed: userId=%s', userId);
  }

  private enqueueProfileUpdated(
    tx: Parameters<AnalyticsOutboxService['enqueue']>[0],
    userId: string,
    profileSection: string,
    patch: Record<string, unknown>,
  ): Promise<unknown> {
    return this.analyticsOutbox.enqueue(tx, 'user.profile.updated.v1', {
      eventName: 'ProfileUpdated',
      aggregateId: userId,
      aggregateType: 'User',
      subjectId: userId,
      properties: {
        profileSection,
        changedFieldCount: Object.values(patch).filter(
          (value) => value !== undefined,
        ).length,
      },
    });
  }
}
