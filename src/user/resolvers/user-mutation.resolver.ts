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
import { getLogger } from '@omnixys/logger';
import {
  AuthenticationRequiredException,
  CookieAuthGuard,
  CurrentUser,
  CurrentUserData,
  RoleGuard,
  Roles,
} from '@omnixys/security';

const logger = getLogger('UserMutationResolver');

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
    logger.info({ userId: input.id }, 'update_user');
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

    logger.info({ userId: currentUser.id }, 'update_me');
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
    logger.info({ userId: id }, 'delete_user');
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

    logger.info(
      {
        userId: currentUser.id,
        count: phoneNumbers.length,
      },
      'add_phone_numbers',
    );
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

    logger.info(
      {
        userId: currentUser.id,
        ids: phoneNumberIds,
      },
      'remove_phone_numbers',
    );
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

    logger.info({ userId: currentUser.id }, 'add_contact');
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

    logger.info({ userId: currentUser.id, contactId }, 'remove_contact');
    await this.service.removeContact(currentUser.id, contactId);
    return true;
  }
}
