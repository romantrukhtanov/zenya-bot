import { CreateFactDto, UpdateFactDto } from './dto';

import { dtoValidation } from '@/common/utils';

export const validateCreateFactData = (data: CreateFactDto) => {
	return dtoValidation(CreateFactDto, data);
};

export const validateUpdateFactData = (data: UpdateFactDto) => {
	return dtoValidation(UpdateFactDto, data);
};
