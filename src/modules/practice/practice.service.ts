import { Injectable } from '@nestjs/common';
import { Practice } from '@prisma/__generated__';

import { CreatePracticeDto, UpdatePracticeDto } from './dto';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PracticeService {
	constructor(private readonly prisma: PrismaService) {}

	async createPractice(createPracticeDto: CreatePracticeDto): Promise<Practice> {
		const { title, content, categoryId } = createPracticeDto;
		return this.prisma.practice.create({
			data: {
				title,
				content,
				categoryId,
			},
		});
	}

	async updatePractice(
		practiceId: string,
		updatePracticeDto: UpdatePracticeDto,
	): Promise<Practice> {
		return this.prisma.practice.update({
			where: { id: practiceId },
			data: updatePracticeDto,
		});
	}

	async findAllPractices(): Promise<Practice[]> {
		return this.prisma.practice.findMany();
	}

	async findPracticeById(practiceId: string): Promise<Practice | null> {
		return this.prisma.practice.findUnique({
			where: { id: practiceId },
		});
	}

	async findPracticesByCategoryId(
		categoryId: string,
		checkPublished?: boolean,
	): Promise<Practice[]> {
		const publishedFilter =
			typeof checkPublished !== 'undefined' ? { isPublished: checkPublished } : {};

		return this.prisma.practice.findMany({
			where: {
				categoryId,
				...publishedFilter,
			},
			orderBy: { order: 'asc' },
		});
	}
}
