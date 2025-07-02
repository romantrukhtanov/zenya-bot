import { IS_DEVELOPMENT } from '@/env';

/**
 * @param param - value that should never exist
 * @param throwOnError - stop app in dev mode on error;
 * set `false` for parameters dependent on external sources (backend, localStorage, etc);
 * if false, take care of the fallback value.
 *
 * @example ```ts
 *   function convert(number: 1 | 2): string {
 *     switch (number) {
 *       case 1:
 *         return '1';
 *       case 2:
 *         return '2';
 *       default:
 *         exhaustiveCheck(number, false);
 *         return 'unknown number';
 *     }
 *   }
 * ```
 */

// @ts-expect-error: never in production
export function exhaustiveCheck(param: never, throwOnError = true): never {
	const paramAsString = (() => {
		try {
			return JSON.stringify(param);
		} catch {
			return String(param);
		}
	})();
	const errorText = `exhaustiveCheck unknown param: ${paramAsString}`;

	if (throwOnError && IS_DEVELOPMENT) {
		throw new Error(errorText);
	} else {
		console.error(errorText);
	}
}
