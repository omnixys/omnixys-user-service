import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { ContactOptionsType, StatusType } from '@omnixys/contracts-ts';

@ObjectType()
export class CustomerPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  subscribed!: boolean;

  @Field(() => StatusType)
  state!: StatusType;

  @Field(() => [ContactOptionsType])
  contactOptions!: ContactOptionsType[];

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
