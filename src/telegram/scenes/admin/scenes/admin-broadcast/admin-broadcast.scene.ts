import type { User } from '@prisma/__generated__';
import { Role } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import type { Message } from 'telegraf/typings/core/types/typegram';

import { AdminBroadcastSceneAction } from './constants';
import { AdminBroadcastWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { BroadcastService } from '@/modules/broadcast';
import { UserService } from '@/modules/user';
import { AdminScene, BotScene } from '@/telegram/constants';
import { SceneCommand } from '@/telegram/scenes/admin/scenes/add-practice/constants';
import { TEXTS } from '@/telegram/scenes/admin/scenes/add-practice/texts';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(AdminScene.Broadcast)
export class AdminBroadcastWizard extends BaseWizardScene<AdminBroadcastWizardContext> {
  constructor(
    private readonly broadcastService: BroadcastService,
    private readonly userService: UserService,
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.sendOrEdit(
      ctx,
      '📢 Массовая рассылка сообщений\n\nВведите текст сообщения для рассылки всем пользователям:',
      [this.goToAdminButton],
      undefined,
      true,
    );

    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async onMessageText(@Ctx() ctx: AdminBroadcastWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const { text: messageText, entities } = message;

    if (!messageText || messageText.trim().length === 0) {
      await this.mediaService.sendText(ctx, '❌ Сообщение не может быть пустым.\nПопробуйте еще раз.');
      return;
    }

    ctx.wizard.state.message = { text: messageText, entities };

    const confirmButton = Markup.button.callback('✅ Подтвердить', AdminBroadcastSceneAction.CONFIRM_SEND);
    const cancelButton = Markup.button.callback('❌ Отменить', AdminBroadcastSceneAction.CANCEL);

    const keyboard = Markup.inlineKeyboard([confirmButton, cancelButton, this.goToAdminButton], { columns: 1 });

    await this.mediaService.sendText(
      ctx,
      `⚠️ Это сообщение будет отправлено всем пользователям бота!\n\nВы уверены, что хотите отправить это сообщение?\n\n📝 Предварительный просмотр сообщения:`,
    );

    await this.mediaService.sendText(ctx, messageText, {
      entities: message.entities,
      inlineKeyboard: keyboard,
      protectContent: false,
    });

    ctx.wizard.next();
  }

  @WizardStep(3)
  @Action(AdminBroadcastSceneAction.CONFIRM_SEND)
  async onConfirmSend(@Ctx() ctx: AdminBroadcastWizardContext) {
    const message = ctx.wizard.state.message;

    if (!message?.text) {
      await this.mediaService.sendText(ctx, '❌ Ошибка: текст сообщения не найден. Попробуйте заново.');
      return this.onRestart(ctx);
    }

    try {
      const users: User[] = await this.userService.findAll();

      const telegramIds = users.map((user: User) => Number(user.telegramId));

      if (telegramIds.length === 0) {
        await this.mediaService.sendText(ctx, '⚠️ Пользователи для рассылки не найдены.');
        return this.backToAdmin(ctx);
      }

      await this.broadcastService.enqueue(telegramIds, { text: message.text, entities: message.entities });

      const successMessage = `✅ Рассылка запущена!\n\n📊 Количество получателей: ${telegramIds.length}\n\n📤 Сообщения будут отправлены в ближайшее время.`;

      const restartButton = Markup.button.callback('🔄 Новая рассылка', BaseCallback.Restart);

      await this.sendOrEdit(ctx, successMessage, [restartButton, this.goToAdminButton], undefined, true);
    } catch (error) {
      console.error('Broadcast error:', error);
      await this.mediaService.sendText(ctx, '❌ Произошла ошибка при запуске рассылки. Попробуйте еще раз.');
      return this.backToAdmin(ctx);
    }
  }

  @Action(AdminBroadcastSceneAction.CANCEL)
  async onCancel(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.mediaService.sendText(ctx, '❌ Рассылка отменена.');
    return this.onRestart(ctx);
  }

  @Action(AdminBroadcastSceneAction.BACK_TO_ADMIN)
  async onBackToAdmin(@Ctx() ctx: AdminBroadcastWizardContext) {
    return this.backToAdmin(ctx);
  }

  private async backToAdmin(ctx: AdminBroadcastWizardContext) {
    return this.navigateTo(ctx, BotScene.Admin);
  }

  get goToAdminButton() {
    return Markup.button.callback(TEXTS.GO_TO_ADMIN, SceneCommand.GO_TO_ADMIN);
  }
}
