import {
  UserNotFoundException,
  UserStateException,
} from '../../dist/user/errors/user.error.js';
import { UserWriteService } from '../../dist/user/services/user-write.service.js';
import { ContextAccessor } from '@omnixys/context';
import assert from 'node:assert/strict';
import test from 'node:test';

const logger = {
  log() {
    return { debug() {}, info() {}, warn() {}, error() {} };
  },
};

test('user errors preserve canonical request metadata', () => {
  ContextAccessor.run(
    {
      requestId: 'request-user',
      correlationId: 'correlation-user',
      actorId: 'actor-user',
      tenantId: 'tenant-user',
    },
    () => {
      const error = new UserNotFoundException('user-1');
      assert.equal(error.code, 'USER_NOT_FOUND');
      assert.equal(error.requestId, 'request-user');
      assert.equal(error.correlationId, 'correlation-user');
      assert.equal(error.actorId, 'actor-user');
      assert.equal(error.tenantId, 'tenant-user');
      assert.deepEqual(error.metadata, { userId: 'user-1' });
    },
  );
});

test('user deletion is idempotent', async () => {
  let deleted = false;
  const service = new UserWriteService(
    {
      user: {
        async findUnique() {
          return null;
        },
        async delete() {
          deleted = true;
        },
      },
    },
    {},
    logger,
  );

  assert.equal(await service.delete('missing-user'), false);
  assert.equal(deleted, false);
});

test('invalid cached registration state uses a structured error', () => {
  const error = new UserStateException('signup-token-expired');
  assert.equal(error.code, 'USER_STATE_INVALID');
  assert.deepEqual(error.metadata, {});
});

test('profile update and analytics fact share one transaction', async () => {
  const transactionClient = {
    personalInfo: {
      async update() {},
    },
  };
  let factTransaction;
  const service = new UserWriteService(
    {
      async $transaction(work) {
        return work(transactionClient);
      },
      personalInfo: { async findUnique() { return null; } },
    },
    {},
    logger,
    {
      async enqueue(tx, topic, fact) {
        factTransaction = tx;
        assert.equal(topic, 'user.profile.updated.v1');
        assert.equal(fact.eventName, 'ProfileUpdated');
        assert.deepEqual(fact.properties, {
          profileSection: 'personal',
          changedFieldCount: 1,
        });
      },
    },
  );

  await service.updatePersonalInfo('user-1', { firstName: 'Changed' });
  assert.equal(factTransaction, transactionClient);
});
