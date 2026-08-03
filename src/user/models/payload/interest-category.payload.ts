import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { InterestCategoryType } from '@omnixys/contracts-ts';

@ObjectType()
export class InterestCategoryPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => InterestCategoryType)
  key!: InterestCategoryType;

  @Field()
  name!: string;

  @Field({ nullable: true })
  icon?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
