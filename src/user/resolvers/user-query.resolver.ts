import { InterestCategoryMapper } from '../models/mapper/interest-category.mapper.js';
import { InterestMapper } from '../models/mapper/interest.mapper.js';
import { userMapper } from '../models/mapper/user.mapper.js';
import { InterestCategoryPayload } from '../models/payload/interest-category.payload.js';
import { InterestPayload } from '../models/payload/interest.payload.js';
import { UserPayload } from '../models/payload/user.payload.js';
import { UserReadService } from '../services/user-read.service.js';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { RealmRoleType } from '@omnixys/contracts-ts';
import { OmnixysLogger } from '@omnixys/logger-ts';
import {
  AuthenticationRequiredException,
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  RoleGuard,
  Roles,
} from '@omnixys/security-ts';

@Resolver(() => UserPayload)
export class UserQueryResolver {
  private readonly log;

  constructor(
    private readonly logger: OmnixysLogger,
    private readonly service: UserReadService,
  ) {
    this.log = this.logger.log(this.constructor.name);
  }

  /* ------------------------------------------------------------------
   * ADMIN / SERVICE QUERY – all users
   * ------------------------------------------------------------------ */
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  @Query(() => [UserPayload], { name: 'users' })
  async getAll(): Promise<UserPayload[]> {
    this.log.debug('getAll: request received');
    const users = await this.service.findAll();
    this.log.debug('getAll: found %d users', users.length);
    return userMapper.toPayloadList(users);
  }

  /* ------------------------------------------------------------------
   * Single user by ID (internal / admin use)
   * ------------------------------------------------------------------ */
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN, RealmRoleType.USER)
  @Query(() => UserPayload, { name: 'pnpm' })
  async getById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<UserPayload> {
    this.log.debug('getById: id=%s', id);
    const user = await this.service.findById(id);
    return userMapper.toPayload(user);
  }

  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN, RealmRoleType.USER)
  @Query(() => UserPayload, { name: 'userById' })
  async getUserById(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<UserPayload> {
    return this.getById(id);
  }

  /* ------------------------------------------------------------------
   * Current authenticated user
   * ------------------------------------------------------------------ */
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Query(() => UserPayload, { name: 'me' })
  async getMe(
    @CurrentUser() currentUser: CurrentUserData,
  ): Promise<UserPayload> {
    if (!currentUser?.id) {
      this.log.warn(
        'getMe: request rejected because user is not authenticated',
      );
      throw new AuthenticationRequiredException();
    }
    this.log.debug('getMe: id=%s', currentUser.id);
    const user = await this.service.findById(currentUser.id);
    return userMapper.toPayload(user, currentUser.role);
  }

  /* ------------------------------------------------------------------
   * Batch user lookup (internal, e.g. Event / Invitation service)
   * ------------------------------------------------------------------ */
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN, RealmRoleType.USER)
  @Query(() => [UserPayload], { name: 'getUserList' })
  async getUserList(
    @Args('userIds', { type: () => [ID] }) userIds: string[],
  ): Promise<UserPayload[]> {
    this.log.debug('getUserList: request received count=%d', userIds.length);
    const users = await this.service.findByIds(userIds);
    this.log.debug('getUserList: found %d users', users.length);
    return userMapper.toPayloadList(users);
  }

  @Query(() => [InterestCategoryPayload], {
    name: 'getAllInterestCategories',
  })
  async getAllInterestCategories(): Promise<InterestCategoryPayload[]> {
    this.log.debug('getAllInterestCategories: request received');
    const entities = await this.service.getAllCategoriesWithInterests();
    this.log.debug(
      'getAllInterestCategories: found %d categories',
      entities.length,
    );
    return InterestCategoryMapper.toPayloadList(entities);
  }

  @Query(() => [InterestPayload])
  async getAllInterests(): Promise<InterestPayload[]> {
    this.log.debug('getAllInterests: request received');
    const interests = await this.service.getAllInterests();
    this.log.debug('getAllInterests: found %d interests', interests.length);
    return InterestMapper.toPayloadList(interests);
  }
}
