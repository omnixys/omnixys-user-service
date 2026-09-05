import {
  Contact,
  Customer,
  CustomerInterest,
  Employee,
  Interest,
  InterestCategory,
  PersonalInfo,
  PhoneNumber,
  User,
} from '../../prisma/generated/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserNotFoundException } from '../errors/user.error.js';
import { Injectable } from '@nestjs/common';
import { OmnixysLogger } from '@omnixys/logger-ts';

/**
 * userReadService
 * -------------------------------------------------------------
 * Provides read-only access to user entities from the database.
 * Uses Prisma for typed data retrieval.
 */
@Injectable()
export class UserReadService {
  private readonly log;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: OmnixysLogger,
  ) {
    this.log = this.logger.log(this.constructor.name, 'service:user');
  }

  async findAll(): Promise<User[]> {
    this.log.debug('findAll: loading all users');

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    this.log.debug('findAll: database lookup completed count=%d', users.length);
    return users;
  }

  // Returns a single user by its ID or throws if not found
  async findById(id: string): Promise<User> {
    this.log.debug('findById: looking up user id=%s', id);

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      this.log.warn('findById: user not found id=%s', id);
      throw new UserNotFoundException(id);
    }

    this.log.debug('findById: database lookup completed id=%s', id);
    return user;
  }

  async findByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) {
      this.log.debug('findByIds: lookup ignored because userIds is empty');
      return [];
    }
    this.log.debug('findByIds: looking up users count=%d', userIds.length);

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      orderBy: {
        username: 'asc',
      },
    });

    this.log.debug(
      'findByIds: database lookup completed requested=%d found=%d',
      userIds.length,
      users.length,
    );
    return users;
  }

  /* ------------------------------------------------------------------
   * Personal Info (1:1)
   * ------------------------------------------------------------------ */

  async getPersonalInfo(userId: string): Promise<PersonalInfo | null> {
    return this.prisma.personalInfo.findUnique({
      where: { id: userId },
    });
  }

  /* ------------------------------------------------------------------
   * Phone Numbers (via PersonalInfo)
   * ------------------------------------------------------------------ */

  async getPhoneNumbers(userId: string): Promise<PhoneNumber[]> {
    return this.prisma.phoneNumber.findMany({
      where: {
        infoId: userId,
      },
      orderBy: {
        isPrimary: 'desc',
      },
    });
  }

  /* ------------------------------------------------------------------
   * Contacts (Person ↔ Person)
   * ------------------------------------------------------------------ */

  async getContacts(userId: string): Promise<Contact[]> {
    return this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /* ------------------------------------------------------------------
   * Customer Extension
   * ------------------------------------------------------------------ */

  async getCustomer(userId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id: userId },
    });
  }

  /* ------------------------------------------------------------------
   * Customer Interest (via Customer)
   * ------------------------------------------------------------------ */

  async getCustomerInterest(customerId: string): Promise<CustomerInterest[]> {
    return this.prisma.customerInterest.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getInterestById(interestId: string): Promise<Interest | null> {
    return this.prisma.interest.findUnique({
      where: { id: interestId },
    });
  }

  async getInterestByCategoryId(categoryId: string): Promise<Interest[]> {
    return this.prisma.interest.findMany({
      where: { categoryId },
    });
  }

  /* ------------------------------------------------------------------
   * Employee Extension
   * ------------------------------------------------------------------ */

  async getEmployee(userId: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({
      where: { id: userId },
    });
  }

  async getAllCategoriesWithInterests(): Promise<InterestCategory[]> {
    return this.prisma.interestCategory.findMany({
      orderBy: { key: 'asc' },
      include: {
        interests: {
          orderBy: { key: 'asc' },
        },
      },
    });
  }

  async getAllInterests(): Promise<Interest[]> {
    return this.prisma.interest.findMany({
      orderBy: { key: 'asc' },
    });
  }
}
