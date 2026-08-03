/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { PhoneNumberMapper } from '../models/mapper/phone-number.mapper.js';
import { PersonalInfoPayload } from '../models/payload/personal-info.payload.js';
import { UserReadService } from '../services/user-read.service.js';
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { PhoneNumberPayload } from '@omnixys/graphql-ts';

@Resolver(() => PersonalInfoPayload)
export class PersonalInfoFieldsResolver {
  constructor(private readonly readService: UserReadService) {}

  /* ------------------------------------------------------------------
   * PhoneNumbers (via PersonalInfo)
   * ------------------------------------------------------------------ */
  @ResolveField(() => [PhoneNumberPayload], { nullable: true })
  async phoneNumbers(@Parent() personalInfo: PersonalInfoPayload) {
    const entities = await this.readService.getPhoneNumbers(personalInfo.id);
    return entities.length ? PhoneNumberMapper.toPayloadList(entities) : [];
  }
}
