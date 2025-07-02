import { customAlphabet } from 'nanoid';

import { CodeToPaidPlan, PaidPlanToCode } from '@/common/constants';
import type { PaidSubscriptionPlan } from '@/common/types';

/**
 * Утилиты для генерации и разбора идентификаторов платежей.
 *
 * Формат:
 *   SUB-{PLAN}-TU{user36}-T{time36}-{rnd4}
 *   └─┬─┘  └──┬──┘ └──┬───┘ └─┬───┘ └┬─┘
 *    тип    план    tg id    время  salt
 *
 * Пример:
 *   SUB-PRM-TU1LKF6-TKKX6AO2-Q3F7
 */
export class PaymentUtils {
	/** Генератор случайного 4-символьного суффикса */
	private readonly random4 = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4);

	/**
	 * Генерирует короткий читабельный orderId.
	 *
	 * @param plan       "PREMIUM" | "STANDARD" | "BASIC"
	 * @param telegramId числовой Telegram-ID пользователя
	 */
	public makeOrderId(plan: PaidSubscriptionPlan, telegramId: number): string {
		const planCode = PaidPlanToCode[plan] ?? 'UNK';

		const userCode = telegramId.toString(36).toUpperCase(); // base-36 id
		const timeCode = Date.now().toString(36).toUpperCase(); // base-36 timestamp
		const rndCode = this.random4(); // соль

		return `SUB-${planCode}-TU${userCode}-T${timeCode}-${rndCode}`;
	}

	/**
	 * Определяет план из orderId.
	 * @returns "PREMIUM" | "STANDARD" | "BASIC" | undefined
	 */
	public extractPlan(orderId: string): string | undefined {
		const [, code] = orderId.split('-'); // ["SUB", "PRM", ...]
		return CodeToPaidPlan[code] ?? 'UNK';
	}

	/**
	 * Извлекает Telegram-ID из orderId.
	 * @returns число или undefined, если парсинг не удался
	 */
	public extractUserId(orderId: string): number | undefined {
		const part = orderId.split('-').find((p) => p.startsWith('TU'));

		if (!part) {
			return undefined;
		}

		const base36 = part.slice(2).toLowerCase(); // убираем 'TU'
		const id = parseInt(base36, 36);

		return Number.isNaN(id) ? undefined : id;
	}
}
