import { SubscriptionPlan } from '@prisma/__generated__';
import { Action, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';

import { DailyCardCallback, DailyCardMedia } from './constants';
import { DailyCardWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { formatSecondsToHumanTime, isPlanSufficient } from '@/common/utils';
import { MetaCardService } from '@/modules/meta-card';
import { UserService } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { BaseWizardScene } from '@/telegram/scenes/base';
import { getTelegramUser } from '@/telegram/utils';
import { translations } from '@/translations';

export type Buttons = ReturnType<typeof Markup.button.callback>[];

@Wizard(BotScene.DailyCard)
export class DailyCardWizard extends BaseWizardScene<DailyCardWizardContext> {
  constructor(
    private readonly metaCardService: MetaCardService,
    private readonly userService: UserService,
    protected readonly mediaService: MediaService,
    protected readonly mainMenuService: MainMenuService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(0)
  async start(@Ctx() ctx: DailyCardWizardContext) {
    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    let caption: string = translations.scenes.dailyCard.intro;

    const [userId, activePlan, role] = await Promise.all([
      this.userService.getUserIdByTelegramId(telegramUser.id),
      this.userService.getActiveUserPlan(telegramUser.id),
      this.userService.getUserRole(telegramUser.id),
    ]);

    const [hasAnyHistory, hasGivenToday, timeUntilNextDailyCard] = await Promise.all([
      this.metaCardService.hasAnyHistory(userId),
      this.metaCardService.hasGivenToday(userId),
      this.metaCardService.getTimeUntilNextDailyCard(userId),
    ]);

    const humanTime = formatSecondsToHumanTime(timeUntilNextDailyCard);

    if (hasGivenToday) {
      caption = translations.scenes.dailyCard.givenToday(humanTime);
    }

    const shouldSubscribe = !isPlanSufficient(activePlan, SubscriptionPlan.BASIC, role) && hasAnyHistory && !hasGivenToday;

    if (shouldSubscribe) {
      caption = translations.scenes.dailyCard.shouldSubscribe;
    }

    const inlineKeyboard = Markup.inlineKeyboard(this.getSceneButtons(shouldSubscribe), {
      columns: 1,
    });

    await this.mediaService.sendVideo(ctx, DailyCardMedia.MetaCards, {
      caption,
      inlineKeyboard,
      parseMode: 'MarkdownV2',
    });
  }

  @Action(DailyCardCallback.ShowDailyCard)
  async onShowDailyCard(@Ctx() ctx: DailyCardWizardContext) {
    await ctx.answerCbQuery();

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const userId = await this.userService.getUserIdByTelegramId(telegramUser.id);

    const card = await this.metaCardService.drawDailyCard(userId);

    if (!card) {
      await this.sendOrEdit(ctx, translations.scenes.dailyCard.unavailableCard, [this.homeButton]);
      return;
    }

    const inlineKeyboard = Markup.inlineKeyboard([this.homeButton]);

    const hasQuestions = card.questions && card.questions.length > 0;

    await this.mediaService.sendPhoto(ctx, card.media.filePath, {
      inlineKeyboard: hasQuestions ? undefined : inlineKeyboard,
    });

    if (card.questions && card.questions.length > 0) {
      const questions = card.questions.join('\n\n');

      await this.mediaService.sendText(ctx, questions, {
        parseMode: 'MarkdownV2',
        inlineKeyboard,
      });
    }
  }

  private getSceneButtons(shouldSubscribe?: boolean) {
    const buttons: Buttons = [];

    if (shouldSubscribe) {
      buttons.push(this.subscriptionButton);
    } else {
      buttons.push(Markup.button.callback(translations.scenes.dailyCard.cardButton, DailyCardCallback.ShowDailyCard));
    }

    buttons.push(this.homeButton);

    return buttons;
  }
}
