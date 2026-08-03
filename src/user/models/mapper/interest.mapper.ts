import type { Interest } from '../../../prisma/generated/client.js';
import type { InterestPayload } from '../payload/interest.payload.js';
import type { InterestType } from '@omnixys/contracts-ts';
import { n2u } from '@omnixys/contracts-ts';

export class InterestMapper {
  static toPayload(interest: Interest): InterestPayload {
    return {
      id: interest.id,
      key: interest.key as InterestType,
      name: interest.name,
      icon: n2u(interest.icon),
      categoryId: interest.categoryId,
      updatedAt: interest.updatedAt,
      createdAt: interest.createdAt,
    };
  }

  static toPayloadList(list: Interest[]): InterestPayload[] {
    return list.map((interest) => this.toPayload(interest));
  }
}
