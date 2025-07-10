import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';

export class CreateChapterDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @IsInt()
  order?: number;
}
