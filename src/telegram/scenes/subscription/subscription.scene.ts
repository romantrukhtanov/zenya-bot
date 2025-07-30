import { Currency, PaymentStatus, SubscriptionPlan } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { CallbackQuery, Message } from 'telegraf/types';

import { PurchaseMethod, SelectedPlanText, SubscriptionCallback, SubscriptionMedia } from './constants';
import { SubscriptionSceneUtils } from './subscription.utils';
import { SubscriptionStep, SubscriptionWizardContext } from './types';

import { SubscriptionPlanButton, SubscriptionStarsPrice, SubscriptionUzsPrice } from '@/common/constants';
import { MainMenuService, MediaService } from '@/common/services';
import type { PaidSubscriptionPlan } from '@/common/types';
import { isUserAdmin } from '@/common/utils';
import { PaymentService } from '@/modules/payment';
import { SubscriptionService } from '@/modules/subscription';
import { UserService } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { BaseWizardScene } from '@/telegram/scenes/base';
import {
  getPaymentButtons,
  getPaymentProvider,
  getPurchaseCurrency,
  getWelcomeText,
  isCurrencyUsdUzs,
} from '@/telegram/scenes/subscription/helpers';
import { getTelegramUser } from '@/telegram/utils';
import { translations } from '@/translations';

@Wizard(BotScene.Subscription)
export class SubscriptionWizard extends BaseWizardScene<SubscriptionWizardContext> {
  constructor(
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
    private readonly paymentService: PaymentService,
    private readonly subscriptionSceneUtils: SubscriptionSceneUtils,
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  /* ------------------------------------------------------------------
   * STEP 0 — старт: показываем информацию о подписке
   * ------------------------------------------------------------------ */
  @WizardStep(0)
  async start(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    if (ctx.wizard.state.step === SubscriptionStep.START) {
      return;
    }

    ctx.wizard.state.step = SubscriptionStep.START;

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const user = await this.userService.findUserByTelegramId(telegramUser.id);

    if (!user) {
      return;
    }

    const isAdmin = isUserAdmin(user.role);

    const activeSubscription = await this.subscriptionService.getActiveSubscription(user.id);

    const isSubscribed = !!activeSubscription || isAdmin;

    const welcomeText = getWelcomeText(user, activeSubscription);

    const planButtons = [
      Markup.button.callback(SubscriptionPlanButton.BASIC, SubscriptionCallback.SelectBasic),
      Markup.button.callback(SubscriptionPlanButton.STANDARD, SubscriptionCallback.SelectStandard),
      Markup.button.callback(SubscriptionPlanButton.PREMIUM, SubscriptionCallback.SelectPremium),
    ];

    const buttons = isSubscribed ? [this.supportLink, this.publicOfferButton] : planButtons;

    buttons.push(this.homeButton);

    await this.ensureSceneMedia(ctx, SubscriptionMedia.Subscription);
    await this.sendOrEdit(ctx, welcomeText, buttons, 'MarkdownV2');
  }

  /* ------------------------------------------------------------------
   * STEP 1 — выбранный план: показываем информацию о выбранном плане
   * ------------------------------------------------------------------ */
  @WizardStep(1)
  async selectedPlan(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    if (ctx.wizard.state.step === SubscriptionStep.SELECTED_PLAN) {
      return;
    }
    ctx.wizard.state.step = SubscriptionStep.SELECTED_PLAN;

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const user = await this.userService.findUserByTelegramId(telegramUser.id);

    if (!user) {
      return;
    }

    const selectedPlan = ctx.wizard.state.selectedPlan!;

    const planText = SelectedPlanText[selectedPlan];

    const paymentButtons = getPaymentButtons();

    const buttons = [
      ...paymentButtons,
      this.publicOfferButton,
      Markup.button.callback(translations.shared.back, SubscriptionCallback.Back),
    ];

    await this.sendOrEdit(ctx, planText, buttons, 'MarkdownV2');
  }

  @WizardStep(2)
  async onPaymentFinish(@Ctx() ctx: SubscriptionWizardContext) {
    if (ctx.wizard.state.step === SubscriptionStep.SUCCESS_PAYMENT) {
      return;
    }
    ctx.wizard.state.step = SubscriptionStep.SUCCESS_PAYMENT;

    await this.mediaService.sendVideo(ctx, SubscriptionMedia.PaymentSuccess, {
      caption: translations.scenes.subscription.success,
      inlineKeyboard: Markup.inlineKeyboard([this.homeButton], {
        columns: 1,
      }),
      parseMode: 'MarkdownV2',
    });
  }

  /* ------------------------------------------------------------------
   * Обработчики выбора плана
   * ------------------------------------------------------------------ */
  @Action(SubscriptionCallback.SelectBasic)
  async onSelectedBasic(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await this.handleSelectPlan(ctx, SubscriptionPlan.BASIC);
  }

  @Action(SubscriptionCallback.SelectStandard)
  async onSelectStandard(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await this.handleSelectPlan(ctx, SubscriptionPlan.STANDARD);
  }

  @Action(SubscriptionCallback.SelectPremium)
  async onSelectPremium(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await this.handleSelectPlan(ctx, SubscriptionPlan.PREMIUM);
  }

  @Action(SubscriptionCallback.PublicOffer)
  async onPublicOffer(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.mediaService.sendFile(ctx, SubscriptionMedia.PublicOffer);
  }

  @Action([PurchaseMethod.PayPayme, PurchaseMethod.PayFreedompay, PurchaseMethod.PayStars])
  async createInvoice(@Ctx() ctx: SubscriptionWizardContext) {
    await ctx.answerCbQuery();

    const callbackQuery = ctx.callbackQuery as CallbackQuery.DataQuery;
    const currency = getPurchaseCurrency(callbackQuery.data as PurchaseMethod);
    const provider = getPaymentProvider(callbackQuery.data as PurchaseMethod);

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const userId = await this.userService.getUserIdByTelegramId(telegramUser.id);

    if (!userId) {
      return;
    }

    const payload = await this.subscriptionSceneUtils.issue(userId, telegramUser.id, ctx.wizard.state.selectedPlan!, currency, provider);

    ctx.wizard.state.orderId = payload.orderId;
    ctx.wizard.state.step = SubscriptionStep.WAIT_PAYMENT;
  }

  private async handleSelectPlan(ctx: SubscriptionWizardContext, plan: PaidSubscriptionPlan) {
    await ctx.answerCbQuery();
    ctx.wizard.state.selectedPlan = plan;
    ctx.wizard.selectStep(1);
    await this.selectedPlan(ctx);
  }

  get publicOfferButton() {
    return Markup.button.callback(translations.shared.publicOffer, SubscriptionCallback.PublicOffer);
  }

  /* ------------------------------------------------------------------
   * Обработчики
   * ------------------------------------------------------------------ */
  @Action(SubscriptionCallback.CancelPayment)
  async onCancelPayment(@Ctx() ctx: SubscriptionWizardContext) {
    await ctx.answerCbQuery();

    const callbackQuery = ctx.callbackQuery as CallbackQuery.DataQuery;

    const orderId = ctx.wizard.state.orderId;
    const messageId = callbackQuery.message?.message_id;

    if (orderId && messageId) {
      await this.paymentService.markPaymentCanceled(orderId, 'Canceled by user');
      await this.mediaService.deleteMessage(ctx, messageId);
    }

    return;
  }

  /* ────── Телеграм payment hooks ─────────────────────────────────────── */

  @On('successful_payment')
  async onPaymentSuccess(@Ctx() ctx: SubscriptionWizardContext) {
    const message = ctx.message as Message.SuccessfulPaymentMessage;
    const payment = message.successful_payment;

    const telegramUser = getTelegramUser(ctx);

    const orderId = payment.invoice_payload;
    const currency = payment.currency as Currency;
    const telegramUserId = Number(telegramUser?.id);

    const paymentOrder = await this.paymentService.getPaymentByOrderId(orderId);

    if (!paymentOrder) {
      return this.mediaService.sendText(ctx, translations.scenes.subscription.paymentOrderError);
    }

    if (paymentOrder.status === PaymentStatus.SUCCEEDED) {
      return;
    }

    const plan = this.paymentService.extractPlan(orderId) as PaidSubscriptionPlan;

    const amount = isCurrencyUsdUzs(currency) ? SubscriptionUzsPrice[plan] : SubscriptionStarsPrice[plan];

    const subscriptionId = await this.subscriptionService.purchaseByTelegramId(telegramUserId, plan, 1, amount, currency);

    if (typeof subscriptionId === 'undefined') {
      await this.mediaService.sendText(ctx, translations.shared.rateLimit);
      return;
    }

    await this.paymentService.markPaymentSucceeded(
      orderId,
      payment.provider_payment_charge_id,
      payment.telegram_payment_charge_id,
      subscriptionId,
    );

    ctx.wizard.next();
    await this.onPaymentFinish(ctx);
  }

  @Action(SubscriptionCallback.Back)
  async onBack(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await ctx.answerCbQuery();
    return this.backToStart(ctx);
  }

  @Action(SubscriptionCallback.BackToSelect)
  async onBackToSelect(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await ctx.answerCbQuery();
    return this.selectedPlan(ctx);
  }

  @Action(SubscriptionCallback.LockedPayment)
  async onLockedPayment(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
    await ctx.answerCbQuery(translations.scenes.subscription.lockedPayment, { show_alert: true });
  }

  private async backToStart(ctx: SubscriptionWizardContext) {
    ctx.wizard.selectStep(0);
    await this.start(ctx);
  }
}
