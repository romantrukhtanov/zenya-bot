import type { User } from '@prisma/__generated__';
import { Role } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import type { Message } from 'telegraf/typings/core/types/typegram';

import { AdminBroadcastSceneAction, AdminSceneCallback, SCENE_BUTTONS, SCENE_CALLBACK_MAP } from './constants';
import { TEXTS } from './texts';
import { AdminBroadcastWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { exhaustiveCheck } from '@/common/utils';
import { BroadcastButton, BroadcastButtonType, BroadcastService } from '@/modules/broadcast';
import { UserService } from '@/modules/user';
import { AdminScene, BotScene, BotSceneCallback } from '@/telegram/constants';
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

  @WizardStep(0)
  async start(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.sendOrEdit(ctx, TEXTS.BROADCAST_START, [this.goToAdminButton], undefined, true);
    ctx.wizard.next();
  }

  @WizardStep(1)
  @On('text')
  async onMessageText(@Ctx() ctx: AdminBroadcastWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const { text: messageText, entities } = message;

    if (!messageText || messageText.trim().length === 0) {
      await this.mediaService.sendText(ctx, TEXTS.EMPTY_MESSAGE_ERROR);
      return;
    }

    ctx.wizard.state.message = { text: messageText, entities };

    const addButtonButton = Markup.button.callback(TEXTS.ADD_BUTTON, AdminBroadcastSceneAction.ADD_BUTTON);
    const skipButtonsButton = Markup.button.callback(TEXTS.SKIP_BUTTONS, AdminBroadcastSceneAction.SKIP_BUTTONS);

    await this.sendOrEdit(ctx, TEXTS.MESSAGE_SAVED, [addButtonButton, skipButtonsButton, this.goToAdminButton], undefined, true);
    ctx.wizard.next();
  }

  @WizardStep(2)
  @Action(AdminBroadcastSceneAction.ADD_BUTTON)
  async onAddButton(@Ctx() ctx: AdminBroadcastWizardContext) {
    if (!ctx.wizard.state.message) {
      ctx.wizard.state.message = { text: '', buttons: [] };
    }
    if (!ctx.wizard.state.message.buttons) {
      ctx.wizard.state.message.buttons = [];
    }

    const urlButton = Markup.button.callback(TEXTS.BUTTON_TYPE_URL, AdminBroadcastSceneAction.BUTTON_TYPE_URL);
    const sceneButton = Markup.button.callback(TEXTS.BUTTON_TYPE_SCENE, AdminBroadcastSceneAction.BUTTON_TYPE_SCENE);

    await this.sendOrEdit(ctx, TEXTS.CHOOSE_BUTTON_TYPE, [urlButton, sceneButton, this.goToAdminButton], undefined, true);
  }

  @WizardStep(3)
  @On('text')
  async onButtonText(@Ctx() ctx: AdminBroadcastWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const buttonText = message.text?.trim();

    if (!buttonText) {
      await this.mediaService.sendText(ctx, TEXTS.EMPTY_BUTTON_TEXT_ERROR);
      return;
    }

    ctx.wizard.state.currentButtonText = buttonText;

    if (ctx.wizard.state.currentButtonType === BroadcastButtonType.URL) {
      await this.sendOrEdit(ctx, TEXTS.ENTER_URL, [this.goToAdminButton], undefined, true);
      ctx.wizard.next(); // Go to step 4 for URL input
    } else {
      await this.sendOrEdit(ctx, TEXTS.CHOOSE_SCENE, [...SCENE_BUTTONS, this.goToAdminButton], undefined, true);
    }
  }

  @WizardStep(4)
  @On('text')
  async onButtonUrl(@Ctx() ctx: AdminBroadcastWizardContext) {
    const message = ctx.message as Message.TextMessage;
    const url = message.text?.trim();

    if (!url || !this.isValidUrl(url)) {
      await this.mediaService.sendText(ctx, TEXTS.INVALID_URL_ERROR);
      return;
    }

    this.addButton(ctx, {
      type: BroadcastButtonType.URL,
      label: ctx.wizard.state.currentButtonText!,
      url: url,
    });

    await this.showButtonsMenu(ctx);
    ctx.wizard.selectStep(2); // Return to step 2 for button management
  }

  @WizardStep(5)
  async showConfirmationStep(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.showConfirmation(ctx);
  }

  @Action(AdminBroadcastSceneAction.SKIP_BUTTONS)
  async onSkipButtons(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.showConfirmation(ctx);
    ctx.wizard.selectStep(5); // Go to confirmation step
  }

  @Action(AdminBroadcastSceneAction.BUTTON_TYPE_URL)
  async onButtonTypeUrl(@Ctx() ctx: AdminBroadcastWizardContext) {
    ctx.wizard.state.currentButtonType = BroadcastButtonType.URL;
    await this.sendOrEdit(ctx, TEXTS.ENTER_BUTTON_TEXT_URL, [this.goToAdminButton], undefined, true);
    ctx.wizard.selectStep(3);
  }

  @Action(AdminBroadcastSceneAction.BUTTON_TYPE_SCENE)
  async onButtonTypeScene(@Ctx() ctx: AdminBroadcastWizardContext) {
    ctx.wizard.state.currentButtonType = BroadcastButtonType.ACTION;
    await this.sendOrEdit(ctx, TEXTS.ENTER_BUTTON_TEXT_SCENE, [this.goToAdminButton], undefined, true);
    ctx.wizard.selectStep(3);
  }

  @Action([
    AdminSceneCallback.Practice,
    AdminSceneCallback.DailyCard,
    AdminSceneCallback.AssistantChat,
    AdminSceneCallback.Consultation,
    AdminSceneCallback.Subscription,
    AdminSceneCallback.Account,
    AdminSceneCallback.Support,
  ])
  async onButtonScene(@Ctx() ctx: AdminBroadcastWizardContext) {
    const action = ctx.match[0] as AdminSceneCallback;

    this.addButton(ctx, {
      type: BroadcastButtonType.ACTION,
      label: ctx.wizard.state.currentButtonText!,
      action: SCENE_CALLBACK_MAP[action],
    });

    await this.showButtonsMenu(ctx);
    ctx.wizard.selectStep(2); // Return to step 2 for button management
  }

  @Action(AdminBroadcastSceneAction.ADD_BUTTON)
  async onAddMoreButton(@Ctx() ctx: AdminBroadcastWizardContext) {
    const urlButton = Markup.button.callback(TEXTS.BUTTON_TYPE_URL, AdminBroadcastSceneAction.BUTTON_TYPE_URL);
    const sceneButton = Markup.button.callback(TEXTS.BUTTON_TYPE_SCENE, AdminBroadcastSceneAction.BUTTON_TYPE_SCENE);

    await this.sendOrEdit(ctx, TEXTS.CHOOSE_BUTTON_TYPE, [urlButton, sceneButton, this.goToAdminButton], undefined, true);
  }

  @Action(AdminBroadcastSceneAction.FINISH_BUTTONS)
  async onFinishButtons(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.showConfirmation(ctx);
    ctx.wizard.selectStep(5);
  }

  @Action(AdminBroadcastSceneAction.CONFIRM_SEND)
  async onConfirmSend(@Ctx() ctx: AdminBroadcastWizardContext) {
    const message = ctx.wizard.state.message;

    if (!message?.text) {
      await this.mediaService.sendText(ctx, TEXTS.MESSAGE_NOT_FOUND_ERROR);
      return this.onRestart(ctx);
    }

    try {
      const users: User[] = await this.userService.findAll();
      const telegramIds = users.map((user: User) => Number(user.telegramId));

      if (telegramIds.length === 0) {
        await this.mediaService.sendText(ctx, TEXTS.NO_USERS_ERROR);
        return this.backToAdmin(ctx);
      }

      await this.broadcastService.enqueue(telegramIds, { text: message.text, entities: message.entities, buttons: message.buttons });

      const successMessage = TEXTS.BROADCAST_STARTED.replace('{count}', telegramIds.length.toString());
      const restartButton = Markup.button.callback(TEXTS.NEW_BROADCAST, BaseCallback.Restart);

      await this.sendOrEdit(ctx, successMessage, [restartButton, this.goToAdminButton], undefined, true);
    } catch (error) {
      console.error('Broadcast error:', error);
      await this.mediaService.sendText(ctx, TEXTS.BROADCAST_ERROR);
      return this.backToAdmin(ctx);
    }
  }

  @Action(AdminBroadcastSceneAction.CANCEL)
  async onCancel(@Ctx() ctx: AdminBroadcastWizardContext) {
    await this.mediaService.sendText(ctx, TEXTS.BROADCAST_CANCELLED);
    return this.onRestart(ctx);
  }

  @Action(AdminBroadcastSceneAction.BACK_TO_ADMIN)
  async onBackToAdmin(@Ctx() ctx: AdminBroadcastWizardContext) {
    return this.backToAdmin(ctx);
  }

  get goToAdminButton() {
    return Markup.button.callback(TEXTS.GO_TO_ADMIN, BotSceneCallback.AdminPanel);
  }

  private async backToAdmin(ctx: AdminBroadcastWizardContext) {
    return this.navigateTo(ctx, BotScene.Admin);
  }

  private addButton(ctx: AdminBroadcastWizardContext, button: BroadcastButton) {
    if (!ctx.wizard.state.message) {
      ctx.wizard.state.message = { text: '', buttons: [] };
    }

    if (!ctx.wizard.state.message.buttons) {
      ctx.wizard.state.message.buttons = [];
    }

    ctx.wizard.state.message.buttons.push(button);
  }

  private async showButtonsMenu(ctx: AdminBroadcastWizardContext) {
    const buttons = ctx.wizard.state.message?.buttons || [];

    const buttonsList =
      buttons.map((btn, index) => `${index + 1}. ${btn.label} ${btn.type === BroadcastButtonType.URL ? '🔗' : '🎯'}`).join('\n') ||
      TEXTS.NO_BUTTONS;

    const addMoreButton = Markup.button.callback(TEXTS.ADD_MORE_BUTTON, AdminBroadcastSceneAction.ADD_BUTTON);
    const finishButton = Markup.button.callback(TEXTS.FINISH_BUTTONS, AdminBroadcastSceneAction.FINISH_BUTTONS);

    await this.sendOrEdit(
      ctx,
      TEXTS.ADDED_BUTTONS.replace('{buttonsList}', buttonsList),
      [addMoreButton, finishButton, this.goToAdminButton],
      undefined,
      true,
    );
  }

  private async showConfirmation(ctx: AdminBroadcastWizardContext) {
    const message = ctx.wizard.state.message;

    if (!message?.text) {
      return;
    }

    const confirmButton = Markup.button.callback(TEXTS.CONFIRM_SEND, AdminBroadcastSceneAction.CONFIRM_SEND);
    const cancelButton = Markup.button.callback(TEXTS.CANCEL, AdminBroadcastSceneAction.CANCEL);
    const keyboard = Markup.inlineKeyboard([confirmButton, cancelButton, this.goToAdminButton], { columns: 1 });

    await this.mediaService.sendText(ctx, TEXTS.CONFIRM_BROADCAST);

    const buttons = this.buildButtonsMarkups(message.buttons);

    await this.mediaService.sendText(ctx, message.text, {
      entities: message.entities,
      inlineKeyboard: buttons,
      protectContent: false,
    });

    await this.mediaService.sendText(ctx, TEXTS.FINAL_CONFIRMATION, {
      inlineKeyboard: keyboard,
    });
  }

  private buildButtonsMarkups(buttons?: BroadcastButton[]) {
    if (!buttons?.length) {
      return undefined;
    }

    return Markup.inlineKeyboard(
      buttons.map(button => {
        switch (button.type) {
          case BroadcastButtonType.URL:
            return Markup.button.url(button.label, button.url);
          case BroadcastButtonType.ACTION:
            return Markup.button.callback(button.label, button.action);
          default:
            exhaustiveCheck(button);
        }
      }),
      { columns: 1 },
    );
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }
}
