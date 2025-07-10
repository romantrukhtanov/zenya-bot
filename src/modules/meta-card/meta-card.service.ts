import { Injectable } from '@nestjs/common';
import { Media, MetaCard, MetaCardHistory, Prisma } from '@prisma/__generated__';
import { format } from 'date-fns';

import { CreateMetaCardDto } from './dto';

import { REDIS_KEY } from '@/common/redis-key';
import { getSecondsUntilMidnight, getUTCDate, isSameUTCDay } from '@/common/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

/**
 * Мета-карта, дополненная объектом media.
 */
export type CardWithMedia = MetaCard & { media: Media };

/**
 * Алиас для клиента транзакции Prisma.
 */
type Tx = Prisma.TransactionClient;

@Injectable()
export class MetaCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /* -----------------------------------------------------------------------
   * ПУБЛИЧНОЕ API
   * --------------------------------------------------------------------- */

  /**
   * Создаёт новую мета-карту вместе со списком вопросов.
   */
  async create(dto: CreateMetaCardDto): Promise<CardWithMedia> {
    return this.prisma.metaCard.create({
      data: {
        title: dto.title,
        mediaId: dto.mediaId,
        questions: dto.questions,
      },
      include: { media: true },
    });
  }

  /**
   * Возвращает `true`, если пользователю уже выдавалась карта **сегодня**.
   * Сначала проверяем кэш в Redis; если записи нет — обращаемся к истории в БД.
   */
  async hasGivenToday(userId: string): Promise<boolean> {
    // Быстрая проверка через Redis
    const dailyCardId = this.getDailyCardKey(userId);
    const isExist = await this.redis.exists(dailyCardId);

    if (isExist) {
      return true;
    }

    const history = await this.getUserCardHistory(userId);

    // История отсутствует — карта ещё ни разу не выдавалась.
    if (!history?.lastAt) {
      return false;
    }

    // Проверяем, что дата та же (карта уже выдавалась сегодня).
    const isSameDay = isSameUTCDay(history.lastAt);

    if (isSameDay && history.lastCardId) {
      await this.cacheDailyCard(userId, history.lastCardId);
    }

    return isSameDay;
  }

  /**
   * Проверяет, выдавалась ли пользователю **хотя бы одна** карта за всё время.
   * Быстрая проверка через Redis невозможна, поскольку ключи дневных карт
   * живут только до полуночи, поэтому обращаемся сразу к базе.
   */
  async hasAnyHistory(userId: string): Promise<boolean> {
    const count = await this.prisma.metaCardHistory.count({
      where: { userId },
    });
    return count > 0;
  }

  /**
   * Возвращает количество секунд до получения новой «карты дня».
   * Если сегодня карта ещё не выдавалась, метод вернёт `0`.
   */
  async getTimeUntilNextDailyCard(userId: string): Promise<number> {
    const hasGivenToday = await this.hasGivenToday(userId);
    if (!hasGivenToday) {
      return 0;
    }

    return getSecondsUntilMidnight();
  }

  /**
   * Возвращает мета-карту по её id либо `null`, если она не найдена.
   */
  async findById(cardId: string): Promise<CardWithMedia | null> {
    return this.prisma.metaCard.findUnique({
      where: { id: cardId },
      include: { media: true },
    });
  }

  /**
   * Выдаёт пользователю «карту дня».
   * Если сегодня карта уже выдавалась — возвращает ту же карту.
   * Иначе выбирает случайную невиденную (или любую) карту,
   * сохраняет событие в истории и кэширует результат в Redis до полуночи.
   */
  async drawDailyCard(userId: string): Promise<CardWithMedia | null> {
    // Если карта уже была сегодня — просто возвращаем её
    const hasGivenToday = await this.hasGivenToday(userId);

    if (hasGivenToday) {
      const cardId = await this.redis.get<string>(this.getDailyCardKey(userId));

      return cardId ? this.findById(cardId) : null;
    }

    // Новая карта: всё делаем в транзакции
    const card = await this.prisma.$transaction(tx => this.drawAndPersist(tx, userId));

    if (!card) {
      return null;
    }

    // Кешируем id карты до конца дня
    await this.cacheDailyCard(userId, card.id);
    return card;
  }

  /* -----------------------------------------------------------------------
   * ВНУТРЕННЯЯ ЛОГИКА: ВЫБОРОС И СОХРАНЕНИЕ КАРТЫ
   * --------------------------------------------------------------------- */

  /** Получить историю показанных карточек конкретного пользователя */
  private async getUserCardHistory(userId: string) {
    return this.prisma.metaCardHistory.findUnique({
      where: { userId },
      select: { lastAt: true, lastCardId: true },
    });
  }

  /**
   * Выбирает карту, обновляет историю и возвращает полную сущность карты.
   */
  private async drawAndPersist(tx: Tx, userId: string): Promise<CardWithMedia | null> {
    // Получаем или создаём историю пользователя
    const history = await this.getOrCreateHistory(tx, userId);

    // Выбираем случайную карту
    const { id: cardId, resetHistory } = await this.pickRandomCard(tx, history.seenIds);

    // Обновляем историю показов
    await this.updateHistory(tx, userId, history, cardId, resetHistory);

    // Возвращаем карту с привязанным media
    return tx.metaCard.findUnique({
      where: { id: cardId },
      include: { media: true },
    });
  }

  /**
   * Логика выбора карты.
   * 1. Пробуем найти невиденную карту;
   * 2. Если все карты уже были показаны — берём любую случайную
   *    и сигнализируем о необходимости сброса списка seenIds.
   */
  private async pickRandomCard(tx: Tx, seenIds: string[]): Promise<{ id: string; resetHistory: boolean }> {
    // Случайная невиденная карта
    const [unseenCard] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
			SELECT id FROM "meta_cards" 
				${seenIds.length ? Prisma.sql`WHERE id NOT IN (${Prisma.join(seenIds)})` : Prisma.sql``}
			ORDER BY RANDOM()
			LIMIT 1;
		`);

    if (unseenCard) {
      return { id: unseenCard.id, resetHistory: false };
    }

    // Все карты уже просмотрены — берём любую
    const [metaCard] = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
			SELECT id FROM "meta_cards" ORDER BY RANDOM() LIMIT 1;
		`);

    return { id: metaCard.id, resetHistory: true };
  }

  /**
   * Получить историю пользователя или создать новую запись при её отсутствии.
   */
  private async getOrCreateHistory(tx: Tx, userId: string) {
    return tx.metaCardHistory.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /**
   * Обновляет историю показов карт.
   */
  private async updateHistory(tx: Tx, userId: string, history: MetaCardHistory, cardId: string, resetHistory: boolean) {
    const newSeenIds = resetHistory ? [cardId] : [...history.seenIds, cardId];

    await tx.metaCardHistory.update({
      where: { userId },
      data: {
        lastAt: getUTCDate(),
        lastCardId: cardId,
        seenIds: newSeenIds,
      },
    });
  }

  /* -----------------------------------------------------------------------
   * ВНУТРЕННИЕ УТИЛИТЫ: REDIS
   * --------------------------------------------------------------------- */

  /**
   * Кладёт id карты в Redis до конца текущего дня.
   */
  private async cacheDailyCard(userId: string, cardId: string): Promise<void> {
    const ttl = getSecondsUntilMidnight();
    await this.redis.set(this.getDailyCardKey(userId), cardId, { ttl });
  }

  /**
   * Генерирует ключ Redis для карты дня конкретного пользователя.
   */
  private getDailyCardKey(userId: string): string {
    return `${REDIS_KEY.USER_DAILY_CARD}:${userId}:${format(getUTCDate(), 'yyyy-MM-dd')}`;
  }

  /* -----------------------------------------------------------------------
   * ВНУТРЕННИЕ УТИЛИТЫ: ДАТЫ
   * --------------------------------------------------------------------- */
}
