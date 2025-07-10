import { CreateCategoryDto, UpdateCategoryDto } from './dto';

import { dtoValidation } from '@/common/utils';

export const validateCreateCategory = (data: CreateCategoryDto) => {
  return dtoValidation(CreateCategoryDto, data);
};

export const validateUpdateCategory = (data: UpdateCategoryDto) => {
  return dtoValidation(UpdateCategoryDto, data);
};
