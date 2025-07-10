import { ArrayMinSize, ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateMetaCardDto {
  @IsNotEmpty({ message: 'Заголовок карты не может быть пустым' })
  @IsString({ message: 'Заголовок карты должен быть строкой' })
  title: string;

  @IsNotEmpty({ message: 'Необходимо указать mediaId' })
  @IsString({ message: 'mediaId должен быть строкой' })
  mediaId: string;

  @IsArray({ message: 'Вопросы должны приходить массивом строк' })
  @ArrayNotEmpty({ message: 'Список вопросов не может быть пустым' })
  @ArrayMinSize(1, { message: 'Должен быть хотя бы один вопрос' })
  @IsString({ each: true, message: 'Каждый вопрос должен быть строкой' })
  questions: string[];
}
