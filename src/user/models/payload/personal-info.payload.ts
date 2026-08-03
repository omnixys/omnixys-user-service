import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { GenderType, MaritalStatusType } from '@omnixys/contracts-ts';

@ObjectType()
export class PersonalInfoPayload {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => Date, { nullable: true })
  birthDate?: Date;

  @Field(() => GenderType, { nullable: true })
  gender?: GenderType;

  @Field(() => MaritalStatusType, { nullable: true })
  maritalStatus?: MaritalStatusType;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
