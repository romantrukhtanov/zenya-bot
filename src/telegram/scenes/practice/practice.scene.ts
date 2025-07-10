import { Action, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';

import { PracticeCallback, PracticeMedia } from './constants';
import { getCategoriesButtons, getChaptersButtons, getPracticesButtons } from './helpers';
import { PracticeStep, PracticeWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { CategoryService } from '@/modules/category';
import { ChapterService } from '@/modules/chapter';
import { FactService } from '@/modules/fact';
import { PracticeService } from '@/modules/practice';
import { UserService } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { BaseWizardScene } from '@/telegram/scenes/base';
import { OnboardingWizardContext } from '@/telegram/scenes/onboarding/types';
import { getTelegramUser } from '@/telegram/utils';
import { translations } from '@/translations';

@Wizard(BotScene.Practice)
export class PracticeWizard extends BaseWizardScene<PracticeWizardContext> {
  constructor(
    private readonly chapterService: ChapterService,
    private readonly categoryService: CategoryService,
    private readonly practiceService: PracticeService,
    private readonly factService: FactService,
    private readonly userService: UserService,
    protected readonly mediaService: MediaService,
    protected readonly mainMenuService: MainMenuService,
  ) {
    super(mainMenuService, mediaService);
  }

  /* ------------------------------------------------------------------
   * STEP 0 — старт: показываем главы
   * ------------------------------------------------------------------ */
  @WizardStep(1)
  async start(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    if (ctx.wizard.state.messageId) {
      return;
    }
    await this.showChapters(ctx);
  }

  /* ------------------------------------------------------------------
   * UI‑рендер глав
   * ------------------------------------------------------------------ */
  private async showChapters(ctx: PracticeWizardContext): Promise<void> {
    ctx.wizard.state.step = PracticeStep.START;

    const chapters = await this.chapterService.getAllChapters();

    if (chapters.length === 0) {
      return;
    }

    await this.ensureSceneMedia(ctx, PracticeMedia.ChapterCategory);

    const chapterButtons = getChaptersButtons(chapters);
    chapterButtons.push(this.homeButton);

    await this.sendOrEdit(ctx, translations.scenes.practice.intro, chapterButtons);
  }

  /* ------------------------------------------------------------------
   * STEP 1 — выбор главы → список категорий
   * ------------------------------------------------------------------ */
  @Action(new RegExp(`^${PracticeCallback.SelectChapter}(.+)`))
  async onChapterSelect(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    if (ctx.wizard.state.step === PracticeStep.CHAPTER) {
      return;
    }

    ctx.wizard.state.step = PracticeStep.CHAPTER;
    await ctx.answerCbQuery();

    const chapterId = ctx.match?.[1] ?? ctx.wizard.state.chapterId;

    if (chapterId) {
      ctx.wizard.state.chapterId = chapterId;
    }

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const [activePlan, role, categories] = await Promise.all([
      this.userService.getActiveUserPlan(telegramUser.id),
      this.userService.getUserRole(telegramUser.id),
      this.categoryService.getCategoriesByChapterId(chapterId),
    ]);

    const backToChaptersButton = Markup.button.callback(translations.scenes.practice.backToChapters, PracticeCallback.BackToChapters);

    if (categories.length === 0) {
      await this.sendOrEdit(ctx, translations.empty.categories, [backToChaptersButton]);
      return;
    }

    const buttons = getCategoriesButtons(categories, activePlan, role);
    buttons.push(backToChaptersButton);

    await this.ensureSceneMedia(ctx, PracticeMedia.ChapterCategory);
    await this.sendOrEdit(ctx, translations.scenes.practice.selectCategory, buttons, 'MarkdownV2');
  }

  /* ------------------------------------------------------------------
   * STEP 2 — выбор категории → список практик (и кнопка «Факты»)
   * ------------------------------------------------------------------ */
  @Action(new RegExp(`^${PracticeCallback.SelectCategory}(.+)`))
  async onCategorySelect(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    if (ctx.wizard.state.step === PracticeStep.CATEGORY) {
      return;
    }

    ctx.wizard.state.step = PracticeStep.CATEGORY;
    await ctx.answerCbQuery();

    const categoryId = ctx.match?.[1] ?? ctx.wizard.state.categoryId;

    if (categoryId) {
      ctx.wizard.state.categoryId = categoryId;
    }

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const [activePlan, role, practices, facts] = await Promise.all([
      this.userService.getActiveUserPlan(telegramUser.id),
      this.userService.getUserRole(telegramUser.id),
      this.practiceService.findPracticesByCategoryId(categoryId, true),
      this.factService.getFactsByCategoryId(categoryId),
    ]);

    const backToCategoriesButton = Markup.button.callback(translations.scenes.practice.backToCategories, PracticeCallback.BackToCategories);

    if (practices.length === 0) {
      await this.sendOrEdit(ctx, translations.empty.practices, [backToCategoriesButton]);
      return;
    }

    ctx.wizard.state.facts = facts.length ? facts : undefined;

    const buttons = getPracticesButtons(practices, activePlan, role, !!facts.length);

    buttons.push(backToCategoriesButton);

    await this.ensureSceneMedia(ctx, PracticeMedia.Practice);
    await this.sendOrEdit(ctx, translations.scenes.practice.selectPractice, buttons, 'MarkdownV2');
  }

  /* ------------------------------------------------------------------
   * STEP 3 — конкретная практика
   * ------------------------------------------------------------------ */
  @Action(new RegExp(`^${PracticeCallback.SelectPractice}(.+)`))
  async onPracticeSelect(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    if (ctx.wizard.state.step === PracticeStep.PRACTICE) {
      return;
    }

    ctx.wizard.state.step = PracticeStep.PRACTICE;
    await ctx.answerCbQuery();

    const practiceId = ctx.match?.[1] ?? ctx.wizard.state.practiceId;

    if (practiceId) {
      ctx.wizard.state.practiceId = practiceId;
    }

    const practice = await this.practiceService.findPracticeById(practiceId);

    const backToCategoriesButton = Markup.button.callback(translations.scenes.practice.backToCategories, PracticeCallback.BackToCategories);

    if (!practice) {
      await this.sendOrEdit(ctx, 'Практика не найдена', [backToCategoriesButton]);
      return;
    }

    const backToPracticesButton = Markup.button.callback(translations.scenes.practice.backToPractices, PracticeCallback.BackToPractices);

    const message = `*${practice.title}*\n\n${practice.content?.trim() || 'Нет описания'}`;

    await this.sendOrEdit(ctx, message, [backToPracticesButton], 'MarkdownV2');
  }

  /* ------------------------------------------------------------------
   * STEP 4 — интересные факты (если есть)
   * ------------------------------------------------------------------ */
  @Action(PracticeCallback.InterestingFacts)
  async onInterestingFacts(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    if (ctx.wizard.state.step === PracticeStep.FACTS) {
      return;
    }

    ctx.wizard.state.step = PracticeStep.FACTS;
    await ctx.answerCbQuery();

    const facts = ctx.wizard.state.facts;

    const backButton = Markup.button.callback(translations.scenes.practice.backToCategory, PracticeCallback.BackToCategories);

    if (!facts?.length) {
      await this.sendOrEdit(ctx, translations.empty.facts, [backButton]);
      return;
    }

    const factsReply = facts.map(fact => `*${fact.title}*\n\n${fact.facts.join('\n\n')}`).join('\n\n');

    await this.sendOrEdit(ctx, factsReply, [backButton], 'MarkdownV2');
  }

  /* ------------------------------------------------------------------
   * COMMON CALLBACKS (Ignore & Back)
   * ------------------------------------------------------------------ */
  @Action(PracticeCallback.Ignore)
  async onIgnore(@Ctx() ctx: OnboardingWizardContext): Promise<void> {
    await ctx.answerCbQuery(translations.shared.subscribeAlert, { show_alert: true });
  }

  /**
   * Назад к главам
   */
  @Action(PracticeCallback.BackToChapters)
  async backToChapters(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.showChapters(ctx);
  }

  /**
   * Назад к категориям или главам (используется из списка практик и из фактов)
   */
  @Action(PracticeCallback.BackToCategories)
  async backToCategories(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    await ctx.answerCbQuery();

    // Если мы были на экране фактов, вернёмся к списку практик той же категории
    if (ctx.wizard.state.step === PracticeStep.FACTS) {
      await this.onCategorySelect(ctx);
      return;
    }

    // Во всех прочих случаях – к списку категорий текущей главы
    await this.onChapterSelect(ctx);
  }

  /**
   * Назад к списку практик (используется из деталей практики)
   */
  @Action(PracticeCallback.BackToPractices)
  async backToPractices(@Ctx() ctx: PracticeWizardContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.onCategorySelect(ctx);
  }
}
