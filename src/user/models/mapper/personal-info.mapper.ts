import type { PersonalInfo } from '../../../prisma/generated/client.js';
import type { PersonalInfoPayload } from '../payload/personal-info.payload.js';
import {
  n2u,
  type GenderType,
  type MaritalStatusType,
} from '@omnixys/contracts-ts';

export class PersonalInfoMapper {
  static toPayload(info: PersonalInfo): PersonalInfoPayload {
    return {
      id: info.id,
      email: info.email,
      firstName: info.firstName,
      lastName: info.lastName,
      birthDate: n2u(info.birthDate),
      gender: n2u(info.gender as GenderType),
      maritalStatus: n2u(info.maritalStatus as MaritalStatusType),
      updatedAt: info.updatedAt,
      createdAt: info.createdAt,
    };
  }
}
