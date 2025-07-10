import { MediaType } from '@prisma/__generated__';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMediaDto {
  @IsNotEmpty({ message: 'Необходимо указать имя медиа файла' })
  @IsString()
  fileName: string;

  @IsNotEmpty({ message: 'Необходимо указать тип медиа' })
  @IsEnum(MediaType, { message: 'Тип медиа должен быть либо PHOTO, либо VIDEO' })
  type: MediaType;

  @IsNotEmpty({ message: 'Необходимо указать путь до медиа файла' })
  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  fileId?: string;

  @IsOptional()
  @IsString()
  fileUniqueId?: string;
}
