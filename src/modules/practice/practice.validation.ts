import { CreatePracticeDto, UpdatePracticeDto } from './dto';

import { dtoValidation } from '@/common/utils';

export const validateCreatePractice = (data: CreatePracticeDto) => {
	return dtoValidation(CreatePracticeDto, data);
};

export const validateUpdatePractice = (data: UpdatePracticeDto) => {
	return dtoValidation(UpdatePracticeDto, data);
};
