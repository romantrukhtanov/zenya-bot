import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateFactDto {
	@IsOptional()
	@IsString()
	title?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	facts?: string[];

	@IsOptional()
	@IsUUID()
	categoryId?: string;
}
