import { createReadStream } from 'node:fs';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Media, MediaType } from '@prisma/__generated__';
import { InjectBot } from 'nestjs-telegraf';
import { type Context, Telegraf } from 'telegraf';
import type { ExtraReplyMessage } from 'telegraf/src/telegram-types';
import type { InputMediaPhoto, InputMediaVideo } from 'telegraf/types';
import type { Message } from 'telegraf/typings/core/types/typegram';

import { CreateMediaDto } from './dto';
import { MediaUtils } from './media.utils';
import { validateCreateMedia } from './media.validation';

import { REDIS_KEY } from '@/common/redis-key';
import { exhaustiveCheck, extractFileName, fileExists, pathToRedisKey, saveToPublicDir } from '@/common/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { buildExtraOptions, ExtraOptions, isInvalidFileIdError } from '@/telegram/utils';

type ExtractFileId = {
  fileId: string;
  fileUniqueId: string;
};

@Injectable()
export class MediaService extends MediaUtils {
  private readonly log = new Logger(MediaService.name);

  constructor(
    @InjectBot()
    protected readonly bot: Telegraf<Context>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    super(bot);
  }

  /* ─────────────  PUBLIC API  ───────────── */
  async getAllByType(type: MediaType): Promise<Media[]> {
    return this.prisma.media.findMany({ where: { type } });
  }

  async sendVideo(ctx: Context | number, filePath: string, extra: ExtraOptions = {}): Promise<number> {
    const fileName = extractFileName(filePath);
    const fileId = await this.getMediaFileId(filePath, MediaType.VIDEO);

    /* 1. Пробуем отправить по сохранённому file_id */
    if (fileId) {
      try {
        const { message_id } = await this.replyWithVideo(ctx, fileId, extra);
        return message_id;
      } catch (error) {
        /* file_id невалиден – чистим кеш и продолжаем */
        if (isInvalidFileIdError(error)) {
          await this.invalidateMediaCache(filePath, MediaType.VIDEO);
        } else {
          throw error;
        }
      }
    }

    /* 2. Загружаем локальный файл, обновляем БД */
    return this.uploadVideoAndSave(ctx, filePath, fileName, extra);
  }

  async editVideo(ctx: Context | number, messageId: number, filePath: string | null, extra: ExtraOptions = {}): Promise<void> {
    const options = buildExtraOptions(extra);

    const chatId = this.getChatId(ctx);

    if (filePath) {
      const fileId = await this.getMediaFileId(filePath, MediaType.VIDEO);

      if (!fileId) {
        return;
      }

      const media: InputMediaVideo = {
        type: 'video',
        media: fileId,
        caption: extra.caption,
        parse_mode: extra.parseMode,
      };

      await this.bot.telegram.editMessageMedia(chatId, messageId, undefined, media, {
        reply_markup: options.reply_markup,
      });
      return;
    }

    await this.bot.telegram.editMessageCaption(chatId, messageId, undefined, extra.caption ?? '', options);
  }

  /** Отправить фото (upload-если-нужно) и вернуть `message_id`.  */
  async sendPhoto(ctx: Context | number, filePath: string, extra: ExtraOptions = {}): Promise<number> {
    const fileName = extractFileName(filePath);
    const fileId = await this.getMediaFileId(filePath, MediaType.PHOTO);

    if (fileId) {
      try {
        const { message_id } = await this.replyWithPhoto(ctx, fileId, extra);
        return message_id;
      } catch (error) {
        if (isInvalidFileIdError(error)) {
          await this.invalidateMediaCache(filePath, MediaType.PHOTO);
        } else {
          throw error;
        }
      }
    }

    return this.uploadPhotoAndSave(ctx, filePath, fileName, extra);
  }

  /** Отредактировать СУЩЕСТВУЮЩЕЕ фото-сообщение. */
  async editPhoto(ctx: Context | number, messageId: number, filePath: string | null, extra: ExtraOptions = {}): Promise<void> {
    const options = buildExtraOptions(extra);

    const chatId = this.getChatId(ctx);

    if (filePath) {
      const fileId = await this.getMediaFileId(filePath, MediaType.PHOTO);

      if (!fileId) {
        return;
      }

      const media: InputMediaPhoto = {
        type: 'photo',
        media: fileId,
        caption: extra.caption,
        parse_mode: extra.parseMode,
      };

      await this.bot.telegram.editMessageMedia(chatId, messageId, undefined, media, {
        reply_markup: options.reply_markup,
      });
    }

    // Если fileId нет – просто меняем подпись / клавиатуру.
    await this.bot.telegram.editMessageCaption(chatId, messageId, undefined, extra.caption ?? '', options);
  }

  async sendFile(ctx: Context | number, filePath: string, extra: ExtraOptions = {}): Promise<number> {
    const fileName = extractFileName(filePath);
    const fileId = await this.getMediaFileId(filePath, MediaType.FILE);

    /* 1. Пробуем отправить по сохранённому file_id */
    if (fileId) {
      try {
        const { message_id } = await this.replyWithDocument(ctx, fileId, extra);
        return message_id;
      } catch (error) {
        /* file_id невалиден – чистим кеш и продолжаем */
        if (isInvalidFileIdError(error)) {
          await this.invalidateMediaCache(filePath, MediaType.FILE);
        } else {
          throw error;
        }
      }
    }

    /* 2. Загружаем локальный файл, обновляем БД */
    return this.uploadFileAndSave(ctx, filePath, fileName, extra);
  }

  /** Отправить текст. */
  async sendText(ctx: Context | number, text: string, extra: ExtraOptions & ExtraReplyMessage = {}): Promise<number> {
    const { message_id } = await this.replyText(ctx, text, extra);
    return message_id;
  }

  /** Отредактировать текст. */
  async editText(ctx: Context | number, messageId: number, text: string, extra: Exclude<ExtraOptions, 'keyboard'> = {}): Promise<void> {
    const chatId = this.getChatId(ctx);

    await this.bot.telegram.editMessageText(chatId, messageId, undefined, text, buildExtraOptions(extra));
  }

  async deleteMessage(ctx: Context, messageId: number): Promise<boolean> {
    try {
      return await ctx.telegram.deleteMessage(ctx.chat!.id, messageId);
    } catch (error) {
      if (error instanceof Error) {
        this.log.error(`Не удалось удалить message_id=${messageId}: ${error.message}`);
      }
      return false;
    }
  }

  async saveMedia(createMediaDto: CreateMediaDto): Promise<Media> {
    await validateCreateMedia(createMediaDto);

    const { fileName, filePath, fileId, type, ...mediaRest } = createMediaDto;

    const media = await this.prisma.media.upsert({
      where: { fileName },
      create: { fileName, fileId, filePath, type, ...mediaRest },
      update: { fileId, type, ...mediaRest },
    });

    const redisKey = this.buildMediaRedisKey(filePath, type);

    await this.redis.set(redisKey, fileId);

    return media;
  }

  async saveToPublicDir(ctx: Context, fileId: string, filePath: string, type: MediaType): Promise<void> {
    try {
      const localPath = this.getLocalPath(filePath, type);

      await saveToPublicDir(ctx, {
        fileId,
        filePath: localPath,
        type,
      });
    } catch (err) {
      this.log.error(err);
    }
  }

  /* ─────────────  PRIVATE HELPERS  ───────────── */
  private async invalidateMediaCache(filePath: string, type: MediaType): Promise<void> {
    const redisKey = this.buildMediaRedisKey(filePath, type);
    await this.redis.delete(redisKey).catch();
  }

  private async uploadVideoAndSave(ctx: Context | number, filePath: string, fileName: string, extra: ExtraOptions = {}): Promise<number> {
    const localPath = this.getLocalPath(filePath, MediaType.VIDEO);

    if (await fileExists(localPath)) {
      const msg = await this.replyWithVideo(ctx, { source: createReadStream(localPath), filename: fileName }, extra);

      const { fileId, fileUniqueId } = this.extractVideoId(msg);

      await this.saveMedia({
        fileName,
        filePath,
        fileId,
        fileUniqueId,
        type: MediaType.VIDEO,
      });

      return msg.message_id;
    }

    const { message_id } = await this.replyText(ctx, `⚠️ Видео «${filePath}» недоступно.`, extra);

    return message_id;
  }

  private async uploadPhotoAndSave(ctx: Context | number, filePath: string, fileName: string, extra: ExtraOptions = {}): Promise<number> {
    const localPath = this.getLocalPath(filePath, MediaType.PHOTO);

    if (await fileExists(localPath)) {
      const msg = await this.replyWithPhoto(ctx, { source: createReadStream(localPath), filename: fileName }, extra);

      const { fileId, fileUniqueId } = this.extractPhotoId(msg);
      await this.saveMedia({
        fileName,
        filePath,
        fileId,
        fileUniqueId,
        type: MediaType.PHOTO,
      });

      return msg.message_id;
    }

    const { message_id } = await this.replyText(ctx, `⚠️ Фото «${filePath}» недоступно.`, extra);

    return message_id;
  }

  private async uploadFileAndSave(ctx: Context | number, filePath: string, fileName: string, extra: ExtraOptions = {}): Promise<number> {
    const localPath = this.getLocalPath(filePath, MediaType.FILE);

    if (await fileExists(localPath)) {
      const msg = await this.replyWithDocument(ctx, { source: createReadStream(localPath), filename: fileName }, extra);

      const { fileId, fileUniqueId } = this.extractDocumentId(msg);
      await this.saveMedia({
        fileName,
        filePath,
        fileId,
        fileUniqueId,
        type: MediaType.FILE,
      });

      return msg.message_id;
    }

    const { message_id } = await this.replyText(ctx, `⚠️ Файл «${filePath}» недоступен.`, extra);

    return message_id;
  }

  private getLocalPath(filePath: string, type: MediaType): string {
    switch (type) {
      case MediaType.PHOTO:
        return join(this.uploadsDir, 'photo', filePath);
      case MediaType.VIDEO:
        return join(this.uploadsDir, 'video', filePath);
      case MediaType.FILE:
        return join(this.uploadsDir, 'files', filePath);
      default:
        exhaustiveCheck(type);
    }
  }

  private get uploadsDir() {
    return this.config.get<string>('PUBLIC_DIR', 'public');
  }

  /** Cache-Aside: Redis → Prisma. */
  private async getMediaFileId(filePath: string, type: MediaType): Promise<string | null> {
    const fileName = extractFileName(filePath);
    const redisKey = this.buildMediaRedisKey(filePath, type);

    const id = await this.redis.get<string>(redisKey);

    if (id) {
      return id;
    }

    const rec = await this.prisma.media.findUnique({ where: { fileName: fileName } });

    if (!rec?.fileId) {
      return null;
    }

    await this.redis.set(redisKey, rec.fileId);
    return rec.fileId;
  }

  private buildMediaRedisKey(filePath: string, type: MediaType): string {
    const segment = pathToRedisKey(filePath);
    return `${REDIS_KEY.MEDIA_FILE_ID}:${segment}:${type}`;
  }

  private extractPhotoId(msg: Message.PhotoMessage): ExtractFileId {
    const photo = msg.photo[msg.photo.length - 1];

    return {
      fileId: photo.file_id,
      fileUniqueId: photo.file_unique_id,
    };
  }

  private extractVideoId(msg: Message.VideoMessage | Message.AnimationMessage): ExtractFileId {
    if ('animation' in msg) {
      return {
        fileId: msg.animation.file_id,
        fileUniqueId: msg.animation.file_unique_id,
      };
    }

    return {
      fileId: msg.video.file_id,
      fileUniqueId: msg.video.file_unique_id,
    };
  }

  private extractDocumentId(msg: Message.DocumentMessage): ExtractFileId {
    return {
      fileId: msg.document.file_id,
      fileUniqueId: msg.document.file_unique_id,
    };
  }
}
