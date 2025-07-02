import { Injectable } from '@nestjs/common';
import { Category } from '@prisma/__generated__';

import { CreateCategoryDto, UpdateCategoryDto } from './dto';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CategoryService {
	constructor(private readonly prisma: PrismaService) {}

	async createCategory(createCategoryDto: CreateCategoryDto): Promise<Category> {
		return this.prisma.category.create({
			data: createCategoryDto,
		});
	}

	async updateCategory(
		categoryId: string,
		updateCategoryDto: UpdateCategoryDto,
	): Promise<Category> {
		return this.prisma.category.update({
			where: { id: categoryId },
			data: updateCategoryDto,
		});
	}

	async getAllCategories(
		includeChapter: boolean = false,
		includeFacts: boolean = false,
	): Promise<Category[]> {
		return this.prisma.category.findMany({
			include: {
				chapter: includeChapter,
				facts: includeFacts,
			},
		});
	}

	async getCategoryById(
		categoryId: string,
		includeChapter: boolean = false,
		includeFacts: boolean = false,
	): Promise<Category | null> {
		return this.prisma.category.findUnique({
			where: { id: categoryId },
			include: {
				chapter: includeChapter,
				facts: includeFacts,
			},
		});
	}

	async getCategoriesByChapterId(
		chapterId: string,
		includeFacts: boolean = false,
	): Promise<Category[]> {
		return this.prisma.category.findMany({
			where: { chapterId },
			include: {
				facts: includeFacts,
			},
		});
	}
}
