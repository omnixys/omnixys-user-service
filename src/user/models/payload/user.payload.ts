import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import {
  PersonStatusType,
  RealmRoleType,
  UserType,
} from '@omnixys/contracts-ts';

/**
 * Represents a user entity in the GraphQL schema.
 * Mirrors the Prisma model `User` from the user-service.
 */
@ObjectType()
export class UserPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  username!: string;

  @Field(() => UserType)
  userType!: UserType;

  @Field(() => PersonStatusType)
  status!: PersonStatusType;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => RealmRoleType, { nullable: true })
  role?: RealmRoleType;
}
