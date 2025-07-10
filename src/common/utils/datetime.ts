import * as dateFns from 'date-fns';
import { differenceInSeconds } from 'date-fns';

export const SECONDS_IN_MINUTE = 60;
export const SECONDS_IN_HOUR = 60 * SECONDS_IN_MINUTE;
export const SECONDS_IN_DAY = 24 * SECONDS_IN_HOUR;

/**
 * Создаёт копию даты через `Date.UTC`, сохраняя все UTC-компоненты.
 *
 * Нужно, когда важна «чистая» UTC-дата без влияния локального пояса.
 */

export const getUTCDate = (date: Date = new Date()): Date => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
};

/**
 * Рассчитывает количество секунд до полуночи (до следующего дня)
 */
export const getSecondsUntilMidnight = (): number => {
  const nowMs = Date.now(); // текущее время в милли-секундах от эпохи (UTC)
  const now = new Date(nowMs);

  // Конструируем «завтра 00:00:00.000» в UTC
  const nextMidnightUtcMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1, // +1 день
    0,
    0,
    0,
    0,
  );

  return Math.floor((nextMidnightUtcMs - nowMs) / 1000);
};

/**
 * Преобразует секунды в читаемое время с корректным склонением (часы или минуты)
 */
export const formatSecondsToHumanTime = (seconds: number): string => {
  if (seconds <= 0) {
    return '0 минут';
  }

  const hours = Math.ceil(seconds / 3600);

  if (hours > 1) {
    return `${hours} ${plural(hours, ['час', 'часа', 'часов'])}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${plural(minutes, ['минуту', 'минуты', 'минут'])}`;
};

/**
 * Типы для склонения существительных
 */
export type PluralForms = {
  one: string; // через 1 час
  few: string; // через 2-4 часа
  many: string; //через 5-20 часов
};

/**
 * Русское склонение существительных по количеству
 */
function plural(count: number, forms: [string, string, string] | PluralForms): string {
  // Если передан объект с именованными формами
  if (!Array.isArray(forms)) {
    const { one, few, many } = forms;
    forms = [one, few, many];
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return forms[1];
  }
  return forms[2];
}

export const isSameDay = (start: Date, end = new Date()): boolean => {
  return dateFns.isSameDay(start, end);
};

export const isSameUTCDay = (left: Date, right: Date = new Date()): boolean => {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
};

export const secondsInDays = (days: number): number => {
  return days * SECONDS_IN_DAY;
};

export const secondsInHours = (hours: number): number => {
  return hours * SECONDS_IN_HOUR;
};

export const secondsInMinutes = (minutes: number): number => {
  return minutes * SECONDS_IN_MINUTE;
};

/**
 * Возвращает количество секунд до targetDate.
 * Если targetDate уже наступила — возвращает 0.
 * @param {Date} targetDate - Дата окончания подписки
 * @param {Date} [fromDate=new Date()] - Опционально: дата отсчёта (по умолчанию сейчас)
 * @returns {number}
 */
export const getSecondsLeft = (targetDate: Date, fromDate = new Date()) => {
  const diffSeconds = differenceInSeconds(targetDate, fromDate);
  return Math.max(0, diffSeconds);
};
