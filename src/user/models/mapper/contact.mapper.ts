import type { Contact } from '../../../prisma/generated/client.js';
import type { ContactPayload } from '../payload/contact.payload.js';
import { n2u, type RelationshipType } from '@omnixys/contracts-ts';

export class ContactMapper {
  static toPayload(contact: Contact): ContactPayload {
    return {
      id: contact.id,
      userId: contact.userId,
      contactId: contact.contactId,
      relationship: contact.relationship as RelationshipType,
      withdrawalLimit: contact.withdrawalLimit,
      emergency: contact.emergency,
      startDate: n2u(contact.startDate),
      endDate: n2u(contact.endDate),
      updatedAt: contact.updatedAt,
      createdAt: contact.createdAt,
    };
  }

  static toPayloadList(list: Contact[]): ContactPayload[] {
    return list.map((contact) => this.toPayload(contact));
  }
}
