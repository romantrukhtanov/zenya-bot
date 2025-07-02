import { IsString, IsOptional, IsBoolean, IsInt, IsUUID } from 'class-validator';

export class CreatePracticeDto {
	@IsString()
	title: string;

	@IsOptional()
	@IsString()
	content?: string;

	@IsUUID()
	categoryId: string;

	@IsOptional()
	@IsBoolean()
	isPublished?: boolean = true;

	@IsOptional()
	@IsInt()
	order?: number = 0;
}
