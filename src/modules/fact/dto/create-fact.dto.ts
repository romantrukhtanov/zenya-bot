import { IsArray, IsString, IsUUID } from 'class-validator';

export class CreateFactDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  facts: string[];

  @IsUUID()
  categoryId: string;
}
