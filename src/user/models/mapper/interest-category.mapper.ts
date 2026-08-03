/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { InterestCategory } from '../../../prisma/generated/client.js';
import type { InterestCategoryPayload } from '../payload/interest-category.payload.js';
import type { InterestCategoryType } from '@omnixys/contracts-ts';

export class InterestCategoryMapper {
  static toPayload(
    interestCategory: InterestCategory,
  ): InterestCategoryPayload {
    return {
      id: interestCategory.id,
      key: interestCategory.key as InterestCategoryType,
      name: interestCategory.name,
      icon: interestCategory.icon ?? undefined,
      description: interestCategory.description ?? undefined,
      updatedAt: interestCategory.updatedAt,
      createdAt: interestCategory.createdAt,
    };
  }

  static toPayloadList(interestCategories: InterestCategory[]) {
    return interestCategories.map((interestCategory) =>
      this.toPayload(interestCategory),
    );
  }
}
