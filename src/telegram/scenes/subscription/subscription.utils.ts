import { Injectable } from '@nestjs/common';
import { Currency, PaymentProvider } from '@prisma/__generated__';
import { InjectBot } from 'nestjs-telegraf';
import { Markup, Telegraf } from 'telegraf';

import { isCurrencyUsdUzs } from './helpers';

import { SubscribePlanLabel, SubscriptionStarsPrice, SubscriptionUzsPrice } from '@/common/constants';
import { PaidSubscriptionPlan } from '@/common/types';
import { PAYMENT_PROVIDER_TOKEN, TELEGRAM_ICON } from '@/env';
import { PaymentService } from '@/modules/payment';
import { SubscriptionCallback } from '@/telegram/scenes';
import { translations } from '@/translations';

@Injectable()
export class SubscriptionSceneUtils {
  constructor(
    private readonly paymentService: PaymentService,
    @InjectBot() private readonly bot: Telegraf,
  ) {}

  async issue(userId: string, chatId: number, plan: PaidSubscriptionPlan, currency: Currency) {
    const isUsdUzs = isCurrencyUsdUzs(currency);

    const amount = isUsdUzs
      ? SubscriptionUzsPrice[plan] * 100 // копейки
      : SubscriptionStarsPrice[plan]; // звёзды

    const provider = isUsdUzs ? PaymentProvider.FREEDOMPAY : PaymentProvider.STARS;

    const providerToken = isUsdUzs ? PAYMENT_PROVIDER_TOKEN : '';

    const orderId = this.paymentService.makeOrderId(plan, chatId);

    const recordAmount = isUsdUzs
      ? amount / 100 // копейки
      : amount; // звёзды

    /* 1. PENDING в БД */
    await this.paymentService.cancelAllPending(userId);
    await this.paymentService.createInvoiceRecord(orderId, userId, recordAmount, currency, provider);

    const planLabel = SubscribePlanLabel[plan];

    const buttons = Markup.inlineKeyboard(
      [Markup.button.pay('💰 Оплатить'), Markup.button.callback('↩️ Отменить', SubscriptionCallback.CancelPayment)],
      { columns: 1 },
    );

    const invoice = await this.bot.telegram.sendInvoice(
      chatId,
      {
        title: planLabel,
        description: translations.scenes.subscription.invoiceDescription,
        payload: orderId,
        provider_token: providerToken,
        photo_url: TELEGRAM_ICON,
        currency: isUsdUzs ? Currency.UZS : currency,
        prices: [{ label: planLabel, amount }],
      },
      buttons,
    );

    return {
      invoice,
      orderId,
    };
  }
}
