import { Role } from '@prisma/__generated__';
import { Action, Command, Composer, Ctx, Help } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';

import { Roles } from '@/common/decorators';
import { BotScene, BotSceneCallback, BotSceneCommand } from '@/telegram/constants';

export const HANDOFF_KEY = '__handoff';

@Composer()
export class TelegramComposer {
  @Roles(Role.ADMIN)
  @Action(BotSceneCallback.AdminPanel)
  @Command(BotSceneCommand.Admin)
  async onAdminPanelWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.Admin);
  }

  @Action(BotSceneCallback.Practice)
  @Command(BotSceneCommand.Practices)
  async onSelectPracticeWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.Practice);
  }

  @Action(BotSceneCallback.DailyCard)
  @Command(BotSceneCommand.Mac)
  async onDailyCardWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.DailyCard);
  }

  @Action(BotSceneCallback.Support)
  @Command(BotSceneCommand.Support)
  @Help()
  async onSupportWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.Support);
  }

  @Action(BotSceneCallback.Subscription)
  @Command(BotSceneCommand.Subscribe)
  async onSubscriptionWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.Subscription);
  }

  @Action(BotSceneCallback.Account)
  @Command(BotSceneCommand.Account)
  async onAccountWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.Account);
  }

  @Action(BotSceneCallback.AssistantChat)
  @Command(BotSceneCommand.Chat)
  async onAssistantChatWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.ZenyaChat);
  }

  @Action(BotSceneCallback.Consultation)
  @Command(BotSceneCommand.Consultation)
  async onConsultationWizard(@Ctx() ctx: Scenes.SceneContext) {
    await this.handoff(ctx, BotScene.Consultation);
  }

  @Command(BotSceneCommand.Leave)
  protected async onLeave(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.session[HANDOFF_KEY]) {
      ctx.session[HANDOFF_KEY] = false;
    }
    return ctx.scene.leave();
  }

  private async handoff(ctx: Scenes.SceneContext, target: BotScene) {
    ctx.session ??= {};
    ctx.session[HANDOFF_KEY] = true;

    await ctx.scene.enter(target);
  }
}
