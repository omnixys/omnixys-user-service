import { ContextAccessor } from '@omnixys/context-ts';
import {
  FrameworkException,
  type FrameworkExceptionOptions,
} from '@omnixys/contracts-ts';

function options(
  metadata: Readonly<Record<string, unknown>> = {},
  cause?: unknown,
): FrameworkExceptionOptions {
  const context = ContextAccessor.get();
  return {
    cause,
    context: {
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      traceId: context?.trace?.traceId,
      actorId: context?.principal?.actorId,
      tenantId: context?.tenant?.tenantId ?? context?.principal?.tenantId,
    },
    metadata,
  };
}

export class UserDomainException extends FrameworkException {
  constructor(
    code: string,
    message: string,
    metadata: Readonly<Record<string, unknown>> = {},
    cause?: unknown,
  ) {
    super(code, message, options(metadata, cause));
  }
}

export class UserNotFoundException extends UserDomainException {
  constructor(userId: string) {
    super('USER_NOT_FOUND', 'User was not found', { userId });
  }
}

export class UserStateException extends UserDomainException {
  constructor(reason: string, cause?: unknown) {
    super(
      'USER_STATE_INVALID',
      'User state is invalid or expired',
      { reason },
      cause,
    );
  }
}
