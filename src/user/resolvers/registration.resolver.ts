import { RegisterService } from '../services/register.service.js';
// import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
// import { ClientIp, Location, RequestCookies, TenantId, Device, Local } from '@omnixys/context';
// import { CookieAuthGuard } from '@omnixys/security';
import { getLogger } from '@omnixys/logger';

const logger = getLogger(RegistrationResolver.name);

@Resolver()
export class RegisterResolver {
  constructor(private readonly service: RegisterService) {}

  // /* ------------------------------------------------------------------
  //  * Create
  //  * ------------------------------------------------------------------ */
  // @Mutation(() => UserPayload, { name: 'createUser' })
  // async create(@Args('input') input: CreateUserInput): Promise<UserPayload> {
  //   const user = await this.service.create(input);
  //   return userMapper.toPayload(user);
  // }

  // @UseGuards(CookieAuthGuard)
  @Query(() => Boolean)
  async checkUsername(@Args('username') username: string): Promise<boolean> {
    logger.debug('check_username', { username });
    return this.service.isUsernameAvailable(username);
  }

  // @UseGuards(CookieAuthGuard)
  @Query(() => Boolean)
  async checkEmail(
    @Args('email') email: string,
    // @TenantId() tenantId: string,
    // @ClientIp() ip: string,
    // @Location() location: string,
    // @Local() locale: string,
    // @Device() device: string,
    // @RequestCookies() cookies: any,
  ): Promise<boolean> {
    // console.log({ tenantId, ip, cookies, locale, location, device });
    logger.debug('check_email', { email });
    return this.service.checkEmail(email);
  }
}
