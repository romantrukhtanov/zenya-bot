import { Injectable } from '@nestjs/common';
import { Chapter } from '@prisma/__generated__';

import { CreateChapterDto, UpdateChapterDto } from './dto';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ChapterService {
	constructor(private readonly prisma: PrismaService) {}

	async createChapter(createChapterDto: CreateChapterDto): Promise<Chapter> {
		return this.prisma.chapter.create({
			data: {
				name: createChapterDto.name,
				description: createChapterDto.description,
				order: createChapterDto.order,
			},
		});
	}

	async updateChapter(chapterId: string, updateChapterDto: UpdateChapterDto): Promise<Chapter> {
		return this.prisma.chapter.update({
			where: { id: chapterId },
			data: updateChapterDto,
		});
	}

	async getAllChapters(
		filter: { includeCategories?: boolean; requireCategory?: boolean } = {},
	): Promise<Chapter[]> {
		const { includeCategories = false, requireCategory = false } = filter;

		return this.prisma.chapter.findMany({
			where: requireCategory
				? {
						categories: {
							some: {}, // Проверка на наличие хотя бы одной категории
						},
					}
				: undefined,
			include: includeCategories
				? {
						categories: true, // Включение списка категорий в результат
					}
				: undefined,
		});
	}

	async getChapterById(chapterId: string): Promise<Chapter | null> {
		return this.prisma.chapter.findUnique({
			where: { id: chapterId },
			include: {
				categories: true,
			},
		});
	}
}
