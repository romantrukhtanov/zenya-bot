import { Ctx, Wizard, WizardStep } from 'nestjs-telegraf';

import { SupportMedia } from './constants';
import { SupportWizardContext } from './types';

import { MainMenuService, MediaService } from '@/common/services';
import { BotScene } from '@/telegram/constants';
import { BaseWizardScene } from '@/telegram/scenes/base';
import { translations } from '@/translations';

@Wizard(BotScene.Support)
export class SupportWizard extends BaseWizardScene<SupportWizardContext> {
  constructor(
    protected readonly mainMenuService: MainMenuService,
    protected readonly mediaService: MediaService,
  ) {
    super(mainMenuService, mediaService);
  }

  @WizardStep(1)
  async start(@Ctx() ctx: SupportWizardContext): Promise<void> {
    await this.showSupportInfo(ctx);
  }

  private async showSupportInfo(ctx: SupportWizardContext): Promise<void> {
    await this.mediaService.sendVideo(ctx, SupportMedia.Support);
    await this.sendOrEdit(ctx, translations.scenes.support.intro, [this.homeButton]);
  }
}
