import { CreateChapterDto, UpdateChapterDto } from './dto';

import { dtoValidation } from '@/common/utils';

export const validateCreateChapter = (data: CreateChapterDto) => {
	return dtoValidation(CreateChapterDto, data);
};

export const validateUpdateChapter = (data: UpdateChapterDto) => {
	return dtoValidation(UpdateChapterDto, data);
};
