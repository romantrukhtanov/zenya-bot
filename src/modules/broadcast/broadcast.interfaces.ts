import type { MessageEntity } from 'telegraf/typings/core/types/typegram';

export enum BroadcastButtonType {
  URL = 'url',
  ACTION = 'action',
}

export type BroadcastUrlButton = { type: BroadcastButtonType.URL; label: string; url: string };
export type BroadcastActionButton = { type: BroadcastButtonType.ACTION; label: string; action: string };

export type BroadcastButton = BroadcastUrlButton | BroadcastActionButton;

export interface BroadcastPayload {
  text: string;
  entities?: MessageEntity[];
  buttons?: BroadcastButton[];
}
