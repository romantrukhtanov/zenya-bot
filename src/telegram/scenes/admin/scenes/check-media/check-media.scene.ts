import { MediaType, Role } from '@prisma/__generated__';
import { Action, Ctx, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, TelegramError } from 'telegraf';

import { SceneCallback, SceneCommand } from './constants';
import { TEXTS } from './texts';
import { CheckMediaWizardContext, MediaCheckResult } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { AdminScene, BotScene } from '@/telegram/constants';
import { BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(AdminScene.CheckMedia)
export class CheckMediaWizard extends BaseWizardScene<CheckMediaWizardContext> {
  constructor(
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: CheckMediaWizardContext) {
    ctx.wizard.state.selectedType = undefined;
    ctx.wizard.state.mediaResults = undefined;

    await this.sendOrEdit(
      ctx,
      TEXTS.INTRO,
      [
        Markup.button.callback(TEXTS.SELECT_PHOTOS, SceneCallback.SelectPhotos),
        Markup.button.callback(TEXTS.SELECT_VIDEOS, SceneCallback.SelectVideos),
        Markup.button.callback(TEXTS.SELECT_FILES, SceneCallback.SelectFiles),
        ...this.sceneButtons,
      ],
      undefined,
      true,
    );
  }

  @Action(SceneCallback.SelectPhotos)
  async onSelectPhotos(@Ctx() ctx: CheckMediaWizardContext) {
    await ctx.answerCbQuery();
    await this.handleMediaTypeSelection(ctx, MediaType.PHOTO);
  }

  @Action(SceneCallback.SelectVideos)
  async onSelectVideos(@Ctx() ctx: CheckMediaWizardContext) {
    await ctx.answerCbQuery();
    await this.handleMediaTypeSelection(ctx, MediaType.VIDEO);
  }

  @Action(SceneCallback.SelectFiles)
  async onSelectFiles(@Ctx() ctx: CheckMediaWizardContext) {
    await ctx.answerCbQuery();
    await this.handleMediaTypeSelection(ctx, MediaType.FILE);
  }

  @Action(new RegExp(`^${SceneCallback.ResendMedia}(.+)`))
  async onResendMedia(@Ctx() ctx: CheckMediaWizardContext) {
    await ctx.answerCbQuery();

    const mediaFileName = ctx.match[1];

    const { selectedType, mediaResults } = ctx.wizard.state;

    if (!selectedType || !mediaResults) {
      return this.start(ctx);
    }

    const mediaResult = mediaResults.find(result => result.fileName === mediaFileName);

    if (!mediaResult) {
      return;
    }

    try {
      switch (selectedType) {
        case MediaType.PHOTO:
          await this.mediaService.sendPhoto(ctx, mediaResult.filePath);
          break;
        case MediaType.VIDEO:
          await this.mediaService.sendVideo(ctx, mediaResult.filePath);
          break;
        case MediaType.FILE:
          await this.mediaService.sendFile(ctx, mediaResult.filePath);
          break;
      }

      await this.sendOrEdit(ctx, TEXTS.FILE_SENT.replace('%s', mediaFileName), undefined, undefined, true);
      mediaResult.isValid = true;

      await this.showMediaCheckResults(ctx, true);
    } catch (error) {
      if (error instanceof TelegramError) {
        await ctx.reply(`Ошибка при отправке файла ${mediaFileName}: ${error.message}`);
      }
    }
  }

  @Action(SceneCommand.SELECT_ANOTHER_TYPE)
  async onSelectAnotherType(@Ctx() ctx: CheckMediaWizardContext) {
    await ctx.answerCbQuery();
    return this.start(ctx);
  }

  @Action(SceneCommand.GO_TO_ADMIN)
  async onGoToAdmin(@Ctx() ctx: CheckMediaWizardContext) {
    this.toggleSkipSceneLeave(ctx, true);

    await ctx.answerCbQuery();
    await ctx.scene.leave();
    return ctx.scene.enter(BotScene.Admin);
  }

  private async handleMediaTypeSelection(ctx: CheckMediaWizardContext, mediaType: MediaType) {
    ctx.wizard.state.selectedType = mediaType;

    const mediaList = await this.mediaService.getAllByType(mediaType);

    if (!mediaList.length) {
      const notFoundText = TEXTS.NO_MEDIA_FOUND.replace('%s', mediaType);

      await this.sendOrEdit(ctx, notFoundText, [this.selectAnotherTypeButton, ...this.sceneButtons], 'MarkdownV2', true);

      return;
    }

    await this.sendOrEdit(ctx, TEXTS.WAITING, undefined, undefined, true);

    const mediaResults: MediaCheckResult[] = mediaList.map(media => ({
      fileId: media.fileId ?? '',
      fileName: media.fileName,
      filePath: media.filePath,
      isValid: false,
    }));

    ctx.wizard.state.mediaResults = mediaResults;

    for (const mediaResult of mediaResults) {
      await this.checkSingleMedia(ctx, mediaResult);
    }

    await this.showMediaCheckResults(ctx);
  }

  private async checkSingleMedia(ctx: CheckMediaWizardContext, mediaResult: MediaCheckResult) {
    try {
      const isValid = await this.mediaService.checkMediaFile(mediaResult.fileId);
      mediaResult.isValid = isValid;
      return isValid;
    } catch {
      mediaResult.isValid = false;
      return false;
    }
  }

  private async showMediaCheckResults(ctx: CheckMediaWizardContext, shouldReply?: boolean) {
    const { selectedType, mediaResults } = ctx.wizard.state;

    if (!selectedType || !mediaResults) {
      return this.start(ctx);
    }

    const mediaButtons = mediaResults.map(result => {
      const indicator = result.isValid ? TEXTS.VALID_INDICATOR : TEXTS.INVALID_INDICATOR;
      const buttonText = `${indicator} ${result.fileName}`;

      if (!result.isValid) {
        return Markup.button.callback(buttonText, `${SceneCallback.ResendMedia}${result.fileName}`);
      }

      return Markup.button.callback(buttonText, SceneCallback.Noop);
    });

    const buttonRows = mediaButtons.map(button => button);

    buttonRows.push(this.selectAnotherTypeButton);

    await this.sendOrEdit(
      ctx,
      TEXTS.CHECKING_MEDIA.replace('%s', selectedType),
      [...buttonRows, ...this.sceneButtons],
      undefined,
      shouldReply,
    );
  }

  @Action(SceneCallback.Noop)
  async onNoop(@Ctx() ctx: CheckMediaWizardContext) {
    await ctx.answerCbQuery('Этот файл уже доступен');
  }

  get goToAdminButton() {
    return Markup.button.callback(TEXTS.GO_TO_ADMIN, SceneCommand.GO_TO_ADMIN);
  }

  get selectAnotherTypeButton() {
    return Markup.button.callback(TEXTS.SELECT_ANOTHER_TYPE, SceneCommand.SELECT_ANOTHER_TYPE);
  }

  get sceneButtons() {
    return [this.goToAdminButton, this.homeButton];
  }
}
