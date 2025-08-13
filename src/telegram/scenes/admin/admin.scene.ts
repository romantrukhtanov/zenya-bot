import { Role } from '@prisma/__generated__';
import { Action, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';

import { AdminSceneAction } from './constants';
import { AdminWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { UserService } from '@/modules/user';
import { AdminScene, BotScene } from '@/telegram/constants';
import { getAdminStartText } from '@/telegram/scenes/admin/helpers';
import { BaseWizardScene } from '@/telegram/scenes/base';
import { translations } from '@/translations';

@Roles(Role.ADMIN)
@Wizard(BotScene.Admin)
export class AdminWizard extends BaseWizardScene<AdminWizardContext> {
  constructor(
    protected readonly mainMenuService: MainMenuService,
    protected readonly userService: UserService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: AdminWizardContext) {
    const buttons = [
      Markup.button.callback(translations.scenes.admin.addPracticeButton, AdminSceneAction.ADD_PRACTICE),
      Markup.button.callback(translations.scenes.admin.addCategoryButton, AdminSceneAction.ADD_CATEGORY),
      Markup.button.callback(translations.scenes.admin.addFactsButton, AdminSceneAction.ADD_FACTS),
      Markup.button.callback(translations.scenes.admin.addCardButton, AdminSceneAction.ADD_META_CARD),
      Markup.button.callback(translations.scenes.admin.checkMediaButton, AdminSceneAction.CHECK_MEDIA),
      Markup.button.callback(translations.scenes.admin.grantSubscriptionButton, AdminSceneAction.GRANT_SUBSCRIPTION),
      Markup.button.callback(translations.scenes.admin.broadcastButton, AdminSceneAction.BROADCAST),
      this.homeButton,
    ];

    const [usersCount, countByReplicas, countOnboarded] = await Promise.all([
      this.userService.getUsersCount(),
      this.userService.countUsersByReplicas(),
      this.userService.countOnboardedUsers(),
    ]);

    const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 });

    await this.mediaService.sendVideo(ctx, 'admin.mp4', {
      caption: getAdminStartText({ usersCount, countByReplicas, countOnboarded }),
      inlineKeyboard: keyboard,
      parseMode: 'MarkdownV2',
    });
  }

  @Action(AdminSceneAction.ADD_PRACTICE)
  async onAddPractice(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.AddPractice);
  }

  @Action(AdminSceneAction.ADD_CATEGORY)
  async onAddCategory(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.AddCategory);
  }

  @Action(AdminSceneAction.ADD_FACTS)
  async onAddFacts(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.AddFacts);
  }

  @Action(AdminSceneAction.ADD_META_CARD)
  async onAddMetaCard(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.AddMetaCard);
  }

  @Action(AdminSceneAction.CHECK_MEDIA)
  async onCheckMedia(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.CheckMedia);
  }

  @Action(AdminSceneAction.GRANT_SUBSCRIPTION)
  async onGrantSubscription(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.GrantSubscription);
  }

  @Action(AdminSceneAction.BROADCAST)
  async onBroadcast(@Ctx() ctx: AdminWizardContext) {
    return this.navigateTo(ctx, AdminScene.Broadcast);
  }
}
