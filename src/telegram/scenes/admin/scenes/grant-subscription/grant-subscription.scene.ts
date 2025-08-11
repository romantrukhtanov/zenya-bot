import { Role, SubscriptionPlan } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { DURATION_LABEL, DURATION_OPTIONS, GRANT_SUBSCRIPTION_MEDIA, SceneCallback, SceneCommand } from './constants';
import { TEXTS } from './texts';
import { FoundUser, GrantSubscriptionWizardContext } from './types';

import { SubscriptionPlanButton } from '@/common/constants';
import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { SubscriptionService } from '@/modules/subscription';
import { UserService } from '@/modules/user';
import { AdminScene, BotScene } from '@/telegram/constants';
import { BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(AdminScene.GrantSubscription)
export class GrantSubscriptionWizard extends BaseWizardScene<GrantSubscriptionWizardContext> {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly userService: UserService,
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: GrantSubscriptionWizardContext) {
    const buttons = [this.goToAdminButton, this.homeButton];

    await this.sendOrEdit(ctx, TEXTS.INTRO, buttons, 'MarkdownV2', true);
  }

  @On('text')
  async onText(@Ctx() ctx: GrantSubscriptionWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const userKey = message?.text?.trim() || '';

    try {
      let foundUser: FoundUser | null = null;

      const user = await this.userService.findUserByKey(userKey);

      if (user) {
        foundUser = {
          id: user.id,
          telegramId: Number(user.telegramId),
          telegramProfile: user.telegramProfile,
        };
      }

      if (!foundUser) {
        const buttons = [this.backToUserButton, this.goToAdminButton];

        await this.sendOrEdit(ctx, TEXTS.USER_NOT_FOUND, buttons, undefined, true);
        return;
      }

      ctx.wizard.state.foundUser = foundUser;

      const userText = TEXTS.USER_FOUND.replace('%s', foundUser.id)
        .replace('%s', String(foundUser.telegramId) || 'Не указан')
        .replace('%s', foundUser.telegramProfile || 'Не указано');

      const buttons = [Markup.button.callback(TEXTS.CONTINUE, SceneCallback.BackToDuration), this.backToUserButton, this.goToAdminButton];

      await this.sendOrEdit(ctx, userText, buttons, undefined, true);
    } catch (err: unknown) {
      console.error(err);
      const buttons = [this.backToUserButton, this.goToAdminButton];
      await this.sendOrEdit(ctx, TEXTS.ERROR, buttons, undefined, true);
    }
  }

  @Action(SceneCallback.BackToDuration)
  async onSelectDuration(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();

    const buttons = [
      Markup.button.callback(TEXTS.DURATION_3_DAYS, SceneCallback.Duration3Days),
      Markup.button.callback(TEXTS.DURATION_WEEK, SceneCallback.DurationWeek),
      Markup.button.callback(TEXTS.DURATION_2_WEEKS, SceneCallback.Duration2Weeks),
      Markup.button.callback(TEXTS.DURATION_MONTH, SceneCallback.DurationMonth),
      Markup.button.callback(TEXTS.BACK, SceneCallback.BackToUser),
      this.goToAdminButton,
    ];

    await this.sendOrEdit(ctx, TEXTS.SELECT_DURATION, buttons, undefined, true);
  }

  @Action(SceneCallback.Duration3Days)
  async onDuration3Days(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedDuration = '3_days';
    return this.onSelectPlan(ctx);
  }

  @Action(SceneCallback.DurationWeek)
  async onDurationWeek(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedDuration = 'week';
    return this.onSelectPlan(ctx);
  }

  @Action(SceneCallback.Duration2Weeks)
  async onDuration2Weeks(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedDuration = '2_weeks';
    return this.onSelectPlan(ctx);
  }

  @Action(SceneCallback.DurationMonth)
  async onDurationMonth(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedDuration = 'month';
    return this.onSelectPlan(ctx);
  }

  @Action(SceneCallback.BackToPlan)
  async onSelectPlan(@Ctx() ctx: GrantSubscriptionWizardContext) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }

    const buttons = [
      Markup.button.callback(SubscriptionPlanButton.BASIC, SceneCallback.PlanBasic),
      Markup.button.callback(SubscriptionPlanButton.STANDARD, SceneCallback.PlanStandard),
      Markup.button.callback(SubscriptionPlanButton.PREMIUM, SceneCallback.PlanPremium),
      Markup.button.callback(TEXTS.BACK, SceneCallback.BackToDuration),
      this.goToAdminButton,
    ];

    await this.sendOrEdit(ctx, TEXTS.SELECT_PLAN, buttons, undefined, true);
  }

  @Action(SceneCallback.PlanBasic)
  async onPlanBasic(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedPlan = SubscriptionPlan.BASIC;
    return this.onConfirmGrant(ctx);
  }

  @Action(SceneCallback.PlanStandard)
  async onPlanStandard(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedPlan = SubscriptionPlan.STANDARD;
    return this.onConfirmGrant(ctx);
  }

  @Action(SceneCallback.PlanPremium)
  async onPlanPremium(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedPlan = SubscriptionPlan.PREMIUM;
    return this.onConfirmGrant(ctx);
  }

  async onConfirmGrant(@Ctx() ctx: GrantSubscriptionWizardContext) {
    const { foundUser, selectedDuration, selectedPlan } = ctx.wizard.state;

    if (!foundUser || !selectedDuration || !selectedPlan) {
      return this.start(ctx);
    }

    const duration = DURATION_OPTIONS[selectedDuration];
    const userName = foundUser.telegramProfile || foundUser.id || String(foundUser.telegramId);

    const confirmText = TEXTS.CONFIRM_GRANT.replace('%s', userName)
      .replace('%s', duration.label)
      .replace('%s', duration.hours.toString())
      .replace('%s', selectedPlan);

    const buttons = [
      Markup.button.callback(TEXTS.CONFIRM_BUTTON, SceneCommand.CONFIRM_GRANT),
      Markup.button.callback(TEXTS.BACK, SceneCallback.BackToPlan),
      this.goToAdminButton,
    ];

    await this.sendOrEdit(ctx, confirmText, buttons, undefined, true);
  }

  @Action(SceneCommand.CONFIRM_GRANT)
  async onConfirmGrantAction(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    const { foundUser, selectedDuration, selectedPlan } = ctx.wizard.state;

    if (!foundUser || !selectedDuration || !selectedPlan) {
      return this.start(ctx);
    }

    try {
      const duration = DURATION_OPTIONS[selectedDuration];

      if (foundUser.telegramId) {
        await this.subscriptionService.grantUnlimitedTrialByTelegramId(foundUser.telegramId, duration.hours, selectedPlan);
      } else {
        await this.subscriptionService.grantUnlimitedTrial(foundUser.id, duration.hours, selectedPlan);
      }

      const userName = foundUser.telegramProfile || foundUser.id || String(foundUser.telegramId);

      const successText = TEXTS.SUCCESS.replace('%s', userName)
        .replace('%s', duration.label)
        .replace('%s', duration.hours.toString())
        .replace('%s', selectedPlan);

      const buttons = [Markup.button.callback(TEXTS.RESTART, SceneCommand.RESTART), this.goToAdminButton];

      await this.sendOrEdit(ctx, successText, buttons, undefined, true);

      const userSuccessText = TEXTS.USER_SUCCESS_TEXT.replace('%d', DURATION_LABEL[selectedDuration]).replace(
        '%s',
        SubscriptionPlanButton[selectedPlan],
      );

      await this.mediaService.sendVideo(foundUser.telegramId, GRANT_SUBSCRIPTION_MEDIA, {
        caption: userSuccessText,
        inlineKeyboard: Markup.inlineKeyboard([this.homeButton], {
          columns: 1,
        }),
        parseMode: 'MarkdownV2',
      });
    } catch (err: unknown) {
      console.error(err);
      const buttons = [Markup.button.callback(TEXTS.BACK, SceneCallback.BackToPlan), this.goToAdminButton];
      await this.sendOrEdit(ctx, TEXTS.ERROR, buttons);
    }
  }

  @Action(SceneCallback.BackToUser)
  async onBackToUser(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    delete ctx.wizard.state.foundUser;
    return this.start(ctx);
  }

  @Action(SceneCommand.GO_TO_ADMIN)
  async onGoToAdmin(@Ctx() ctx: GrantSubscriptionWizardContext) {
    this.toggleSkipSceneLeave(ctx, true);

    await ctx.answerCbQuery();
    await ctx.scene.leave();
    return ctx.scene.enter(BotScene.Admin);
  }

  @Action(SceneCommand.RESTART)
  async onRestart(@Ctx() ctx: GrantSubscriptionWizardContext) {
    await ctx.answerCbQuery();
    delete ctx.wizard.state.foundUser;
    delete ctx.wizard.state.selectedDuration;
    delete ctx.wizard.state.selectedPlan;
    return this.start(ctx);
  }

  get backToUserButton() {
    return Markup.button.callback(TEXTS.BACK, SceneCallback.BackToUser);
  }

  get goToAdminButton() {
    return Markup.button.callback(TEXTS.GO_TO_ADMIN, SceneCommand.GO_TO_ADMIN);
  }
}
