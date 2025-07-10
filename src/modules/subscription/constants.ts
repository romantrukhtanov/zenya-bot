export const QUEUE_SUBSCRIPTIONS = 'subscriptions';

export enum QueueSubscriptionJob {
  Expire = 'Expire',
  NotifyBeforeExpire = 'NotifyBeforeExpire',
}
