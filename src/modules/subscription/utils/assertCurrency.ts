import { BadRequestException } from '@nestjs/common';
import { Currency } from '@prisma/__generated__';

export const assertCurrency = (currency: Currency) => {
	if (!Object.values(Currency).includes(currency)) {
		throw new BadRequestException('Неподдерживаемая валюта');
	}
};
