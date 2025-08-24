import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';

import { ConsultationMedia } from './constants';
import { getWelcomeText } from './helpers';
import { ConsultationWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { isUserAdmin } from '@/common/utils';
import { SubscriptionService } from '@/modules/subscription';
import { UserService } from '@/modules/user';
import { BotScene } from '@/telegram/constants';
import { SubscriptionWizardContext } from '@/telegram/scenes';
import { BaseWizardScene } from '@/telegram/scenes/base';
import { getTelegramUser } from '@/telegram/utils';

@Wizard(BotScene.Consultation)
export class ConsultationWizard extends BaseWizardScene<ConsultationWizardContext> {
  constructor(
    protected readonly userService: UserService,
    protected readonly subscriptionService: SubscriptionService,
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(0)
  async start(@Ctx() ctx: SubscriptionWizardContext): Promise<void> {
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

    const welcomeText = getWelcomeText(user, isSubscribed);

    const buttons = isSubscribed ? [this.supportLink] : [this.supportLink, this.subscriptionButton];

    buttons.push(this.homeButton);

    await this.ensureSceneMedia(ctx, ConsultationMedia.Consultation);
    await this.sendOrEdit(ctx, welcomeText, buttons, 'MarkdownV2');
  }
}
