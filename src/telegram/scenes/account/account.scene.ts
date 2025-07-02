import { SubscriptionPlan } from '@prisma/__generated__';
import { Action, Ctx, Next, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { AccountCallback, AccountMedia } from './constants';
import { AccountWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { isUserAdmin } from '@/common/utils';
import { SubscriptionService } from '@/modules/subscription';
import { UserService } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { getUserInfo } from '@/telegram/scenes/account/helpers';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';
import { getTelegramUser } from '@/telegram/utils';
import { translations } from '@/translations';

@Wizard(BotScene.Account)
export class AccountWizard extends BaseWizardScene<AccountWizardContext> {
	constructor(
		private readonly userService: UserService,
		private readonly subscriptionService: SubscriptionService,
		protected readonly mediaService: MediaService,
		protected readonly mainMenuService: MainMenuService,
	) {
		super(mainMenuService, mediaService);
	}

	@WizardStep(1)
	async start(@Ctx() ctx: AccountWizardContext) {
		const telegramUser = getTelegramUser(ctx);

		if (!telegramUser) {
			return;
		}

		const user = await this.userService.findUserByTelegramId(telegramUser.id);

		if (!user) {
			return;
		}

		const activeSubscription = await this.subscriptionService.getActiveSubscription(user.id);

		const caption = getUserInfo(user, activeSubscription);
		const isAdmin = isUserAdmin(user.role);

		const buttons = [
			Markup.button.callback(
				translations.scenes.account.changeNameButton,
				AccountCallback.ChangeName,
			),
		];

		const shouldShowSubscribeButton =
			!activeSubscription || activeSubscription.plan === SubscriptionPlan.FREE;

		if (shouldShowSubscribeButton && !isAdmin) {
			buttons.push(this.subscriptionButton);
		}

		buttons.push(this.homeButton);

		await this.mediaService.sendVideo(ctx, AccountMedia.Hello, {
			caption,
			inlineKeyboard: Markup.inlineKeyboard(buttons, { columns: 1 }),
			parseMode: 'HTML',
		});
	}

	@Action(AccountCallback.ChangeName)
	async onChangeName(@Ctx() ctx: AccountWizardContext) {
		await ctx.answerCbQuery();
		ctx.wizard.state.isChangingName = true;

		await this.mediaService.sendText(ctx, translations.scenes.account.changeNameIntro);
	}

	@On('text')
	async onText(@Ctx() ctx: AccountWizardContext, @Next() next: () => Promise<void>) {
		const telegramUser = getTelegramUser(ctx);

		if (!telegramUser) {
			return;
		}

		if (!ctx.wizard.state.isChangingName) {
			return next();
		}

		const message = ctx.message as Message.TextMessage;
		const nameText = message.text.trim();

		if (nameText.startsWith('/')) {
			return next();
		}

		if (!nameText) {
			await this.mediaService.sendText(ctx, 'Имя не может быть пустым. Попробуйте еще раз.');
			return;
		}

		await this.userService.updateUser(telegramUser.id, { name: nameText });

		await this.mediaService.sendText(
			ctx,
			`${translations.scenes.account.changeNameSuccess} *${nameText}*`,
			{
				parseMode: 'MarkdownV2',
			},
		);

		ctx.wizard.state.isChangingName = false;

		await this.start(ctx);
	}

	@Action(BaseCallback.Subscribe)
	async onSubscribe(ctx: AccountWizardContext) {
		await this.navigateTo(ctx, BotScene.Subscription);
	}
}
