import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { InterestType } from '@omnixys/contracts-ts';

@ObjectType()
export class InterestPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => InterestType)
  key!: InterestType;

  @Field(() => String)
  name!: string;

  @Field(() => ID)
  categoryId!: string;

  @Field({ nullable: true })
  icon?: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
