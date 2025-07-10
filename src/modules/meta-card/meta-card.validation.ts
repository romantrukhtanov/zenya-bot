import { CreateMetaCardDto } from './dto';

import { dtoValidation } from '@/common/utils';

export const validateCreateMetaCard = (data: CreateMetaCardDto) => {
  return dtoValidation(CreateMetaCardDto, data);
};
