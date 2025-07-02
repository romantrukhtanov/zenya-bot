import { dtoValidation } from '@/common/utils';
import { CreateUserDto } from '@/modules/user';

export const validateUserData = async (data: CreateUserDto): Promise<void> => {
	return dtoValidation(CreateUserDto, data);
};
