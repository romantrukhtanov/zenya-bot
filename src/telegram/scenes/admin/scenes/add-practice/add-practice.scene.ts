import { Role } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { TEXTS } from './texts';
import { AddPracticeWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { CategoryService } from '@/modules/category';
import { ChapterService } from '@/modules/chapter';
import { CreatePracticeDto, PracticeService } from '@/modules/practice';
import { AdminScene, BotSceneCallback } from '@/telegram/constants';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(AdminScene.AddPractice)
export class AddPracticeWizard extends BaseWizardScene<AddPracticeWizardContext> {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly practiceService: PracticeService,
    private readonly chapterService: ChapterService,
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: AddPracticeWizardContext) {
    await ctx.reply(TEXTS.INTRO);

    const chapters = await this.chapterService.getAllChapters();

    if (!chapters || chapters.length === 0) {
      await this.sendOrEdit(ctx, TEXTS.NO_CHAPTERS, this.sceneButtons, 'MarkdownV2', true);
      return;
    }

    const buttons = chapters.map(chapter => Markup.button.callback(chapter.name, `select_chapter_${chapter.id}`));

    buttons.push(...this.sceneButtons);

    await this.sendOrEdit(ctx, TEXTS.SELECT_CHAPTER, buttons, 'MarkdownV2', true);
  }

  // New action handler for chapter selection
  @Action(/select_chapter_(.+)/)
  async onChapterSelected(@Ctx() ctx: AddPracticeWizardContext) {
    ctx.wizard.state.chapterId = ctx.match[1];

    await ctx.answerCbQuery();

    const categories = await this.categoryService.getCategoriesByChapterId(ctx.match[1]);

    if (!categories || categories.length === 0) {
      await this.sendOrEdit(ctx, TEXTS.NO_CATEGORIES, this.sceneButtons);
      return;
    }

    const buttons = categories.map(category => Markup.button.callback(category.name, `select_category_${category.id}`));

    buttons.push(...this.sceneButtons);

    await this.sendOrEdit(ctx, TEXTS.SELECT_CATEGORY, buttons);
  }

  @Action(/select_category_(.+)/)
  async onCategorySelected(@Ctx() ctx: AddPracticeWizardContext) {
    ctx.wizard.state.categoryId = ctx.match[1];

    await ctx.answerCbQuery();
    await ctx.reply(TEXTS.ENTER_TITLE);

    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async getTitle(@Ctx() ctx: AddPracticeWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const title = message?.text?.trim();

    if (!title) {
      await ctx.reply('Название не может быть пустым. Пожалуйста, введите название практики:');
      return;
    }

    ctx.wizard.state.title = title;

    await ctx.reply(TEXTS.ENTER_CONTENT);
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('text')
  async getContent(@Ctx() ctx: AddPracticeWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const content = message?.text?.trim();

    if (!content) {
      await ctx.reply('Отсутствует контент. Пожалуйста, добавьте содержимое практики.');
      return;
    }

    try {
      const { title, categoryId } = ctx.wizard.state;

      if (!title || !categoryId) {
        await ctx.reply('Отсутствуют обязательные поля. Пожалуйста, начните заново.');
        return this.reenterScene(ctx);
      }

      const createPracticeDto: CreatePracticeDto = {
        title,
        categoryId,
        content,
      };

      const practice = await this.practiceService.createPractice(createPracticeDto);

      const message = `*${createPracticeDto.title}*\n\n${createPracticeDto.content?.trim() || 'Нет описания'}`.trim();

      await ctx.reply(`${TEXTS.PRACTICE_CREATED}\nНазвание: ${practice.title}\nID: ${practice.id}`);

      await ctx.reply(message, { parse_mode: 'MarkdownV2' });

      ctx.wizard.next();
      return this.finishStep(ctx);
    } catch (err) {
      console.error(err);
      await ctx.reply(TEXTS.CREATION_ERROR);
      return ctx.scene.leave();
    }
  }

  @WizardStep(4)
  async finishStep(@Ctx() ctx: AddPracticeWizardContext) {
    const buttons = [Markup.button.callback(TEXTS.CREATE_NEW_PRACTICE, BaseCallback.Restart), ...this.sceneButtons];

    await ctx.reply(TEXTS.AFTER_CREATION, Markup.inlineKeyboard(buttons, { columns: 1 }));
  }

  get goToAdminButton() {
    return Markup.button.callback(TEXTS.GO_TO_ADMIN, BotSceneCallback.AdminPanel);
  }

  get sceneButtons() {
    return [this.goToAdminButton, this.homeButton];
  }
}
