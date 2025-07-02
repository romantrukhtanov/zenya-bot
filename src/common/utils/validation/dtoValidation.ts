import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';

export const dtoValidation = async <TDto extends object>(
	dtoClass: new () => TDto,
	data: TDto,
): Promise<void> => {
	const dtoInstance = plainToInstance(dtoClass, data);
	const errors: ValidationError[] = await validate(dtoInstance);

	if (errors.length > 0) {
		const formattedErrors = errors.flatMap((error) => {
			const constraints = error.constraints ?? {};

			return Object.values(constraints).map((constraintMessage) => ({
				field: error.property,
				message: constraintMessage,
				code: 'VALIDATION_ERROR',
			}));
		});

		throw new BadRequestException(formattedErrors);
	}
};
