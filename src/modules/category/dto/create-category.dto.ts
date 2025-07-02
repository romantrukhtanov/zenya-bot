import { IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCategoryDto {
	@IsString()
	name: string;

	@IsUUID()
	chapterId: string;

	@IsOptional()
	@IsNumber()
	@IsInt()
	order?: number;
}
