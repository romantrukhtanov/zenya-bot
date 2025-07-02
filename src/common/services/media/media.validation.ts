import { CreateMediaDto } from './dto';

import { dtoValidation } from '@/common/utils';

export const validateCreateMedia = (data: CreateMediaDto) => {
	return dtoValidation(CreateMediaDto, data);
};
