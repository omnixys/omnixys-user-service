import { UserStateException } from '../../dist/user/errors/user.error.js';
import { RegisterService } from '../../dist/user/services/register.service.js';
import assert from 'node:assert/strict';
import test from 'node:test';

const logger = {
  log() {
    return { debug() {}, info() {}, warn() {}, error() {} };
  },
};

function makeService({ userCreate, personalInfoFind, userFind, phoneNumberFind }) {
  const calls = { userCreate: [], personalInfoCreate: [] };
  const tx = {
    user: {
      async create(data) {
        calls.userCreate.push(data);
        if (userCreate) {
          return userCreate(data);
        }
        return { id: data.data.id, keycloakSub: data.data.keycloakSub };
      },
    },
    personalInfo: {
      async create(data) {
        calls.personalInfoCreate.push(data);
        return {};
      },
    },
  };
  const service = new RegisterService(
    { $transaction: async (fn) => fn(tx) },
    { send() {} },
    logger,
  );
  // emitProjectionChanged queries; tolerate undefined returns
  service.prisma = {
    $transaction: async (fn) => fn(tx),
    personalInfo: { findUnique: async () => undefined },
    phoneNumber: { findMany: async () => [] },
    user: { findUnique: () => userFind || (async () => undefined) },
  };
  return { service, calls };
}

const baseInput = {
  username: 'ada',
  personalInfo: { email: 'a@x.io', firstName: 'Ada' },
  userType: 'CUSTOMER',
};

test('RegisterService.create fails closed when identity is incomplete', async () => {
  const { service } = makeService({});
  await assert.rejects(
    () => service.create(baseInput, { userId: '', keycloakSub: 'k' }),
    (error) => error instanceof UserStateException && error.code === 'USER_STATE_INVALID',
  );
  await assert.rejects(
    () => service.create(baseInput, { userId: 'u', keycloakSub: '' }),
    (error) => error instanceof UserStateException,
  );
});

test('RegisterService.create persists canonical U and Keycloak K', async () => {
  const { service, calls } = makeService({});
  await service.create(baseInput, {
    userId: '0190f0f0-0000-7000-8000-000000000001',
    keycloakSub: 'keycloak-subject-1',
  });
  const created = calls.userCreate[0];
  assert.equal(created.data.id, '0190f0f0-0000-7000-8000-000000000001');
  assert.equal(created.data.keycloakSub, 'keycloak-subject-1');
  assert.notEqual(created.data.id, created.data.keycloakSub);
});

test('RegisterService.createGuest fails closed without keycloakSub', async () => {
  const { service, calls } = makeService({});
  await assert.rejects(
    () =>
      service.createGuest({
        userId: '0190f0f0-0000-7000-8000-000000000002',
        keycloakSub: '',
        username: 'guest',
        email: 'g@x.io',
        firstName: 'G',
        lastName: 'U',
        actorId: '0190f0f0-0000-7000-8000-000000000001',
      }),
    (error) => error instanceof UserStateException,
  );
  assert.equal(calls.userCreate.length, 0);
});

test('RegisterService.createGuest persists canonical U and Keycloak K', async () => {
  const { service, calls } = makeService({});
  await service.createGuest({
    userId: '0190f0f0-0000-7000-8000-000000000003',
    keycloakSub: 'keycloak-subject-2',
    username: 'guest2',
    email: 'g2@x.io',
    firstName: 'G',
    lastName: '2',
    actorId: '0190f0f0-0000-7000-8000-000000000001',
  });
  const created = calls.userCreate[0];
  assert.equal(created.data.id, '0190f0f0-0000-7000-8000-000000000003');
  assert.equal(created.data.keycloakSub, 'keycloak-subject-2');
});

test('RegisterService.createProviderUser fails closed without keycloakSub', async () => {
  const { service, calls } = makeService({});
  await assert.rejects(
    () =>
      service.createProviderUser({
        userId: '0190f0f0-0000-7000-8000-000000000004',
        keycloakSub: '',
      }),
    (error) => error instanceof UserStateException,
  );
  assert.equal(calls.userCreate.length, 0);
});