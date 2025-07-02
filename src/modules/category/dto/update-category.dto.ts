import { IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateCategoryDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsUUID()
	chapterId?: string;

	@IsOptional()
	@IsNumber()
	@IsInt()
	order?: number;
}
