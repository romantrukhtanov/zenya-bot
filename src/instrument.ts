import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const environment = process.env.NODE_ENV ?? 'development';
const dsn = process.env.SENTRY_DSN;

export const isProd = environment === 'production';
const enabled = isProd && !!process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  environment,
  enabled,
  release: `zeni-bot@${process.env.COMMIT_SHA ?? 'dev'}`,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: isProd ? 0.2 : 1.0,
  profileSessionSampleRate: isProd ? 0.2 : 1.0,
  profileLifecycle: 'trace',
});
