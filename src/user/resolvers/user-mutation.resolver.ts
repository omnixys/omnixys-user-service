import { userMapper } from '../models/mapper/user.mapper.js';
import {
  AddContactInput,
  PhoneNumberInput,
  UpdateMeInput,
  UpdateUserInput,
} from '@omnixys/graphql';

import { UserPayload } from '../models/payload/user.payload.js';
import { UserWriteService } from '../services/user-write.service.js';

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { RealmRoleType } from '@omnixys/contracts';
import {
  AuthenticationRequiredException,
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  RoleGuard,
  Roles,
} from '@omnixys/security';
import { getLogger } from '@omnixys/logger';

const logger = getLogger(UserMutationResolver.name);

@Resolver(() => UserPayload)
export class UserMutationResolver {
  constructor(private readonly service: UserWriteService) {}

  /* ------------------------------------------------------------------
   * Update (admin / internal)
   * ------------------------------------------------------------------ */

  @Mutation(() => UserPayload, { name: 'updateUser' })
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async update(@Args('input') input: UpdateUserInput): Promise<UserPayload> {
    logger.info('update_user', { userId: input.id });
    const user = await this.service.update(input);
    return userMapper.toPayload(user);
  }

  /* ------------------------------------------------------------------
   * Update current user
   * ------------------------------------------------------------------ */
  @UseGuards(CookieAuthGuard)
  @Mutation(() => UserPayload, { name: 'updateMe' })
  async updateMe(
    @CurrentUser() currentUser: CurrentUserData,
    @Args('input') input: UpdateMeInput,
  ): Promise<UserPayload> {
    if (!currentUser?.id) {
      throw new AuthenticationRequiredException();
    }

    logger.info('update_me', { userId: currentUser.id });
    const user = await this.service.update({
      ...input,
      id: currentUser.id,
    });
    return userMapper.toPayload(user);
  }

  /* ------------------------------------------------------------------
   * Delete user
   * ------------------------------------------------------------------ */

  @Mutation(() => Boolean, { name: 'deleteUser' })
  @UseGuards(CookieAuthGuard, RoleGuard)
  @Roles(RealmRoleType.ADMIN)
  async delete(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    logger.info('delete_user', { userId: id });
    return this.service.delete(id);
  }

  /* ------------------------------------------------------------------
   * Phone Numbers
   * ------------------------------------------------------------------ */

  @UseGuards(CookieAuthGuard)
  @Mutation(() => Boolean, { name: 'addPhoneNumbers' })
  async addPhoneNumbers(
    @CurrentUser() currentUser: CurrentUserData,
    @Args('phoneNumbers', { type: () => [PhoneNumberInput] })
    phoneNumbers: PhoneNumberInput[],
  ): Promise<boolean> {
    if (!currentUser?.id) {
      throw new AuthenticationRequiredException();
    }

    logger.info('add_phone_numbers', { userId: currentUser.id, count: phoneNumbers.length });
    await this.service.addPhoneNumber({
      userId: currentUser.id,
      phoneNumbers,
    });

    return true;
  }

  @UseGuards(CookieAuthGuard)
  @Mutation(() => Boolean, { name: 'removePhoneNumbers' })
  async removePhoneNumbers(
    @CurrentUser() currentUser: CurrentUserData,
    @Args('phoneNumberIds', { type: () => [ID] })
    phoneNumberIds: string[],
  ): Promise<boolean> {
    if (!currentUser?.id) {
      throw new AuthenticationRequiredException();
    }

    logger.info('remove_phone_numbers', { userId: currentUser.id, ids: phoneNumberIds });
    await this.service.removePhoneNumber({
      userId: currentUser.id,
      ids: phoneNumberIds,
    });

    return true;
  }

  /* ------------------------------------------------------------------
   * Contacts
   * ------------------------------------------------------------------ */

  @UseGuards(CookieAuthGuard)
  @Mutation(() => Boolean, { name: 'addContact' })
  async addContact(
    @CurrentUser() currentUser: CurrentUserData,
    @Args('contact')
    input: AddContactInput,
  ): Promise<boolean> {
    if (!currentUser?.id) {
      throw new AuthenticationRequiredException();
    }

    logger.info('add_contact', { userId: currentUser.id });
    await this.service.addContact({ ...input, userId: currentUser.id });
    return true;
  }

  @UseGuards(CookieAuthGuard)
  @Mutation(() => Boolean, { name: 'removeContact' })
  async removeContact(
    @CurrentUser() currentUser: CurrentUserData,
    @Args('contactId', { type: () => ID }) contactId: string,
  ): Promise<boolean> {
    if (!currentUser?.id) {
      throw new AuthenticationRequiredException();
    }

    logger.info('remove_contact', { userId: currentUser.id, contactId });
    await this.service.removeContact(currentUser.id, contactId);
    return true;
  }
}
