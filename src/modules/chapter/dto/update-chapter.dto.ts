import { IsOptional, IsString, IsNumber, IsInt } from 'class-validator';

export class UpdateChapterDto {
	@IsOptional()
	@IsString()
	name?: string;

	@IsOptional()
	@IsString()
	description?: string;

	@IsOptional()
	@IsNumber()
	@IsInt()
	order?: number;
}
