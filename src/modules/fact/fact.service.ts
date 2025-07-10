import { Injectable } from '@nestjs/common';
import { Fact } from '@prisma/__generated__';

import { CreateFactDto, UpdateFactDto } from './dto';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class FactService {
  constructor(private readonly prisma: PrismaService) {}

  async createFact(createFactDto: CreateFactDto): Promise<Fact> {
    return this.prisma.fact.create({
      data: {
        title: createFactDto.title,
        facts: createFactDto.facts,
        categoryId: createFactDto.categoryId,
      },
    });
  }

  async updateFact(factId: string, updateFactDto: UpdateFactDto): Promise<Fact> {
    return this.prisma.fact.update({
      where: { id: factId },
      data: updateFactDto,
    });
  }

  async getAllFacts(includeCategory: boolean = false): Promise<Fact[]> {
    return this.prisma.fact.findMany({
      include: {
        category: includeCategory,
      },
    });
  }

  async getFactById(factId: string, includeCategory: boolean = false): Promise<Fact | null> {
    return this.prisma.fact.findUnique({
      where: { id: factId },
      include: {
        category: includeCategory,
      },
    });
  }

  async getFactsByCategoryId(categoryId: string): Promise<Fact[]> {
    if (!categoryId) {
      return [];
    }
    return this.prisma.fact.findMany({
      where: { categoryId },
    });
  }

  async deleteFact(factId: string): Promise<Fact> {
    return this.prisma.fact.delete({
      where: { id: factId },
    });
  }
}
