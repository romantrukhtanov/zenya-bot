import { Command, Ctx, On, Start, Update } from 'nestjs-telegraf';
import { Context, Scenes } from 'telegraf';

import { MainMenuService } from '@/common/services';
import { IS_PRODUCTION } from '@/env';
import { AgentService } from '@/modules/agent';
import { SubscriptionService } from '@/modules/subscription';
import { UserService } from '@/modules/user';
import { BotScene, BotSceneCommand } from '@/telegram/constants';
import { SubscriptionWizardContext } from '@/telegram/scenes';
import { getTelegramUser } from '@/telegram/utils';

@Update()
export class TelegramUpdate {
  constructor(
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
    private readonly mainMenuService: MainMenuService,
    private readonly agentService: AgentService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Scenes.SceneContext) {
    await this.handleUserStart(ctx);
  }

  private async handleUserStart(ctx: Scenes.SceneContext): Promise<void> {
    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const user = await this.userService.findUserByTelegramId(telegramUser.id);

    if (user) {
      await this.mainMenuService.showMainMenu(ctx);
    } else {
      await ctx.scene.enter(BotScene.Onboarding);
    }
  }

  @Command(BotSceneCommand.Menu)
  @Command(BotSceneCommand.Leave)
  async onMainMenu(@Ctx() ctx: Scenes.SceneContext) {
    await this.onStart(ctx);
  }

  @Command('delete')
  async onDelete(@Ctx() ctx: Context): Promise<void> {
    if (IS_PRODUCTION) {
      return;
    }

    const telegramUser = getTelegramUser(ctx);

    if (!telegramUser) {
      return;
    }

    const userId = await this.userService.getUserIdByTelegramId(telegramUser.id);

    if (!userId) {
      return;
    }

    await this.subscriptionService.cancelAllActive(userId);
    await this.agentService.clearAllInactiveChatJobs(userId);

    const deletedUser = await this.userService.deleteUser(telegramUser.id);

    if (!deletedUser) {
      await ctx.reply('При попытке удаления пользователя возникла ошибка...');
      return;
    }

    await ctx.reply('Ваш пользователь был успешно удален!');
  }

  @On('pre_checkout_query')
  async onPaymentPreCheckout(@Ctx() ctx: SubscriptionWizardContext) {
    await ctx.answerPreCheckoutQuery(true);
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.mainMenuService.showMainMenu(ctx);
  }
}
