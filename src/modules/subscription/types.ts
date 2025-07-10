export type ExpireJobType = {
  userId: string;
};

export type NotifyBeforeExpireJobType = {
  userId: string;
  expireAt: Date;
};
