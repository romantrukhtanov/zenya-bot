import { IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';

export class UpdatePracticeDto {
	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsString()
	content?: string;

	@IsOptional()
	@IsBoolean()
	isPublished?: boolean;

	@IsOptional()
	@IsInt()
	order?: number;
}
