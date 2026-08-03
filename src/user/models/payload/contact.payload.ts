import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { RelationshipType } from '@omnixys/contracts-ts';

@ObjectType()
export class ContactPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  userId!: string;

  @Field()
  contactId!: string;

  @Field(() => RelationshipType)
  relationship!: RelationshipType;

  @Field()
  withdrawalLimit!: number;

  @Field()
  emergency!: boolean;

  @Field(() => Date, { nullable: true })
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  endDate?: Date;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
