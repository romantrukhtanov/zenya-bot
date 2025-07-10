import type { Provider } from '@nestjs/common';
import { ArgumentsHost, Catch } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';

@Catch()
export class SentryHttpFilter extends SentryGlobalFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }
    super.catch(exception, host);
  }
}

export const SentryHttpFilterProvider: Provider = {
  provide: APP_FILTER,
  useClass: SentryHttpFilter,
};
