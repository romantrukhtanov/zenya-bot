import { SubscriptionPlan } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { OnboardingCallback, OnboardingMedia, OnboardingStep } from './constants';
import { getCategoriesButtons, getChaptersButtons, getPracticesButtons } from './helpers';
import type { OnboardingWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { CategoryService } from '@/modules/category';
import { ChapterService } from '@/modules/chapter';
import { FactService } from '@/modules/fact';
import { PracticeService } from '@/modules/practice';
import { CreateUserDto, UserService, validateUserData } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';
import { getTelegramUser, getTelegramUserBio } from '@/telegram/utils';
import { translations } from '@/translations';

@Wizard(BotScene.Onboarding)
export class OnboardingWizard extends BaseWizardScene<OnboardingWizardContext> {
  constructor(
    private readonly userService: UserService,
    private readonly chapterService: ChapterService,
    private readonly categoryService: CategoryService,
    private readonly practiceService: PracticeService,
    private readonly factService: FactService,
    protected readonly mediaService: MediaService,
    protected readonly mainMenuService: MainMenuService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.messageId) {
      return;
    }

    ctx.wizard.state.step = OnboardingStep.INTRO;

    await this.mediaService.sendVideo(ctx, OnboardingMedia.Intro, {
      caption: translations.scenes.onboarding.intro,
      parseMode: 'MarkdownV2',
    });

    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async getName(@Ctx() ctx: OnboardingWizardContext) {
    ctx.wizard.state.step = OnboardingStep.NAME;

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const name = (ctx.message as Message.TextMessage).text.trim();

    if (name.startsWith('/')) {
      await this.mediaService.sendText(ctx, translations.scenes.onboarding.nameError, {
        parseMode: 'MarkdownV2',
      });
      return;
    }

    const dto: CreateUserDto = {
      telegramId: telegramUser.id,
      telegramUser: getTelegramUserBio(telegramUser),
      telegramProfile: telegramUser.username,
      name,
      activePlan: SubscriptionPlan.FREE,
    };

    await validateUserData(dto);
    await this.userService.registerUser(dto);
    await this.showChapters(ctx);
  }

  async showChapters(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.messageId) {
      return;
    }

    const chapters = await this.chapterService.getAllChapters();

    if (!chapters?.length) {
      await this.mediaService.sendText(ctx, 'Категории не найдены!');
      return;
    }

    const chaptersButtons = getChaptersButtons(chapters);

    await this.sendOrEdit(ctx, translations.scenes.onboarding.welcome, chaptersButtons);
  }

  @Action(new RegExp(`^${OnboardingCallback.SelectChapter}(.+)`))
  async onChapterSelect(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.step === OnboardingStep.CATEGORY) {
      return;
    }

    await ctx.answerCbQuery();
    ctx.wizard.state.step = OnboardingStep.CATEGORY;

    const chapterId = ctx.match?.[1] ?? ctx.wizard.state.chapterId;
    ctx.wizard.state.chapterId = chapterId;

    const categories = await this.categoryService.getCategoriesByChapterId(chapterId);

    if (!categories.length) {
      await this.sendOrEdit(ctx, translations.empty.categories);
      return this.showChapters(ctx);
    }

    await this.sendOrEdit(ctx, translations.scenes.onboarding.chooseCategory, getCategoriesButtons(categories), 'MarkdownV2');
  }

  @Action(new RegExp(`^${OnboardingCallback.SelectCategory}(.+)`))
  async onCategorySelect(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.step === OnboardingStep.PRACTICE_FACTS) {
      return;
    }

    await ctx.answerCbQuery();
    ctx.wizard.state.step = OnboardingStep.PRACTICE_FACTS;

    const categoryId = ctx.match?.[1] ?? ctx.wizard.state.categoryId;
    ctx.wizard.state.categoryId = categoryId;

    const practices = await this.practiceService.findPracticesByCategoryId(categoryId);

    if (!practices.length) {
      await this.sendOrEdit(ctx, translations.empty.practices);
      return this.onChapterSelect(ctx);
    }

    const buttons = getPracticesButtons(practices);

    const interestingFactsButton = Markup.button.callback(`📚 ${translations.shared.interestingFacts}`, OnboardingCallback.SelectFacts);

    buttons.push(interestingFactsButton);

    await this.sendOrEdit(ctx, translations.scenes.onboarding.choosePractice, buttons);
  }

  @Action(new RegExp(`^${OnboardingCallback.SelectPractice}(.+)`))
  async onPracticeSelect(@Ctx() ctx: OnboardingWizardContext) {
    await ctx.answerCbQuery();

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const practiceId = ctx.match?.[1] ?? ctx.wizard.state.practiceId;
    ctx.wizard.state.practiceId = practiceId;

    const practice = await this.practiceService.findPracticeById(practiceId);

    if (!practice) {
      await this.sendOrEdit(ctx, translations.empty.practices);
      return this.onCategorySelect(ctx);
    }

    const nextButton = Markup.button.callback(translations.shared.next, OnboardingCallback.PracticeFactNext);

    const message = `*${practice.title}*\n\n${practice.content?.trim() || translations.empty.description}`.trim();

    await this.sendOrEdit(ctx, message, [nextButton], 'MarkdownV2');

    await this.userService.updateUser(telegramUser.id, { hasOnboarded: true });
  }

  @Action(OnboardingCallback.SelectFacts)
  async onFactsSelect(@Ctx() ctx: OnboardingWizardContext) {
    await ctx.answerCbQuery();

    const categoryId = ctx.wizard.state.categoryId!;

    const facts = await this.factService.getFactsByCategoryId(categoryId);

    if (!facts?.length) {
      await this.sendOrEdit(ctx, translations.empty.facts);
      return;
    }

    const nextButton = Markup.button.callback(translations.shared.next, OnboardingCallback.PracticeFactNext);

    const factsReply = facts
      .map(fact => {
        const title = fact.title;
        const facts = fact.facts.join('\n\n');

        return `${title}\n\n${facts}`;
      })
      .join('\n\n');

    await this.sendOrEdit(ctx, factsReply, [nextButton], 'MarkdownV2');
  }

  @Action(OnboardingCallback.PracticeFactNext)
  async onPracticeFactNext(@Ctx() ctx: OnboardingWizardContext) {
    await ctx.answerCbQuery();

    ctx.wizard.next();
    await this.getCongratsContent(ctx);
  }

  @WizardStep(3)
  async getCongratsContent(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.step === OnboardingStep.CONGRATS) {
      return;
    }

    ctx.wizard.state.step = OnboardingStep.CONGRATS;

    const nextButton = Markup.button.callback(translations.shared.next, OnboardingCallback.MetaCardsNext);

    await this.ensureSceneMedia(ctx, OnboardingMedia.Congrats);
    await this.sendOrEdit(ctx, translations.scenes.onboarding.practiceFactCongrats, [nextButton], 'MarkdownV2', true);
  }

  @Action(OnboardingCallback.MetaCardsNext)
  async onMetaCardsNext(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.step === OnboardingStep.META_CARDS) {
      return;
    }

    await ctx.answerCbQuery();
    ctx.wizard.state.step = OnboardingStep.META_CARDS;

    const chatNextButton = Markup.button.callback(translations.shared.next, OnboardingCallback.ChatNext);

    await this.sendOrEdit(ctx, translations.scenes.onboarding.chatInfo, [chatNextButton], 'MarkdownV2');
  }

  @Action(OnboardingCallback.ChatNext)
  async onChatNext(@Ctx() ctx: OnboardingWizardContext) {
    if (ctx.wizard.state.step === OnboardingStep.CHAT) {
      return;
    }

    await ctx.answerCbQuery();
    ctx.wizard.state.step = OnboardingStep.CHAT;

    const goToMainButton = Markup.button.callback(translations.scenes.onboarding.goToMain, BaseCallback.GoToMain);

    await this.ensureSceneMedia(ctx, OnboardingMedia.Gift);
    await this.sendOrEdit(ctx, translations.scenes.onboarding.finish, [this.subscriptionButton, goToMainButton], 'MarkdownV2');
  }
}
