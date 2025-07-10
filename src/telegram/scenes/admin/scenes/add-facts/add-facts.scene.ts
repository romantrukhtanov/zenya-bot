import { Role } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { SceneCommand } from './constants';
import { TEXTS } from './texts';
import { AddFactsWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { CategoryService } from '@/modules/category';
import { ChapterService } from '@/modules/chapter';
import { FactService, validateCreateFactData } from '@/modules/fact';
import { CreateFactDto } from '@/modules/fact/dto/create-fact.dto';
import { AdminScene, BotScene } from '@/telegram/constants';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(AdminScene.AddFacts)
export class AddFactsWizard extends BaseWizardScene<AddFactsWizardContext> {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly factService: FactService,
    private readonly chapterService: ChapterService,
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: AddFactsWizardContext) {
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

  @Action(/select_chapter_(.+)/)
  async onChapterSelected(@Ctx() ctx: AddFactsWizardContext) {
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
  async onCategorySelected(@Ctx() ctx: AddFactsWizardContext) {
    ctx.wizard.state.categoryId = ctx.match[1];

    await ctx.answerCbQuery();
    await ctx.reply(TEXTS.ENTER_TITLE);

    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async getTitle(@Ctx() ctx: AddFactsWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const title = message?.text?.trim();

    if (!title) {
      await ctx.reply('Заголовок не может быть пустым. Пожалуйста, введите заголовок:');
      return;
    }

    ctx.wizard.state.title = title;

    await ctx.reply(TEXTS.ENTER_FACTS);
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('text')
  async getFacts(@Ctx() ctx: AddFactsWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const factsText = message?.text?.trim();

    if (!factsText) {
      await ctx.reply('Факты не могут быть пустыми. Пожалуйста, введите факты:');
      return;
    }

    const facts = factsText
      .split('\n')
      .filter(Boolean)
      .map(fact => fact.trim());

    if (facts.length === 0) {
      await ctx.reply('Не удалось распознать факты. Пожалуйста, введите факты, разделяя их символом новой строки:');
      return;
    }

    try {
      const { title, categoryId } = ctx.wizard.state;

      if (!title || !facts || !categoryId) {
        await ctx.reply('Отсутствуют обязательные поля. Пожалуйста, начните заново.');
        return this.reenterScene(ctx);
      }

      const createFactDto: CreateFactDto = {
        title,
        facts,
        categoryId,
      };

      await validateCreateFactData(createFactDto);
      const fact = await this.factService.createFact(createFactDto);

      await ctx.reply(`${TEXTS.FACTS_CREATED}\nЗаголовок: ${fact.title}\nID: ${fact.id}`);

      const factContent = `*${fact.title}*\n\n${fact.facts.join('\n\n')}`;
      await ctx.reply(`Вот как выглядит добавленный факт:\n\n${factContent}`, {
        parse_mode: 'MarkdownV2',
      });

      ctx.wizard.next();
      return this.finishStep(ctx);
    } catch (err) {
      console.error(err);
      await ctx.reply(TEXTS.CREATION_ERROR);
    }
  }

  @WizardStep(4)
  async finishStep(@Ctx() ctx: AddFactsWizardContext) {
    const buttons = [Markup.button.callback(TEXTS.CREATE_NEW_FACTS, BaseCallback.Restart), ...this.sceneButtons];

    await ctx.reply(TEXTS.AFTER_CREATION, Markup.inlineKeyboard(buttons, { columns: 1 }));
  }

  @Action(SceneCommand.GO_TO_ADMIN)
  async onGoToAdmin(@Ctx() ctx: AddFactsWizardContext) {
    this.toggleSkipSceneLeave(ctx, true);

    await ctx.answerCbQuery();
    await ctx.scene.leave();
    return ctx.scene.enter(BotScene.Admin);
  }

  get goToAdminButton() {
    return Markup.button.callback(TEXTS.GO_TO_ADMIN, SceneCommand.GO_TO_ADMIN);
  }

  get sceneButtons() {
    return [this.goToAdminButton, this.homeButton];
  }
}
