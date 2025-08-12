import type { MessageEntity } from 'telegraf/typings/core/types/typegram';

export interface BroadcastPayload {
  text: string;
  entities?: MessageEntity[];
}
