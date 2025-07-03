import { MediaType, Role } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { META_CARDS_FOLDER_NAME, SceneCommand } from './constants';
import { TEXTS } from './texts';
import type { AddMetaCardWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import type { CreateMediaDto } from '@/common/services/media/dto';
import type { CreateMetaCardDto } from '@/modules/meta-card';
import { MetaCardService } from '@/modules/meta-card';
import { AdminScene, BotScene } from '@/telegram/constants';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(AdminScene.AddMetaCard)
export class AddMetaCardWizard extends BaseWizardScene<AddMetaCardWizardContext> {
	constructor(
		private readonly metaCardService: MetaCardService,
		protected readonly mainMenuService: MainMenuService,
		protected readonly mediaService: MediaService,
	) {
		super(mainMenuService, mediaService);
	}

	@WizardStep(1)
	async start(@Ctx() ctx: AddMetaCardWizardContext) {
		await ctx.reply(TEXTS.INTRO);

		await this.sendOrEdit(ctx, TEXTS.SEND_META_CARD_PHOTO, undefined, 'MarkdownV2', true);

		ctx.wizard.next();
	}

	@WizardStep(2)
	@On('photo')
	async handlePhoto(@Ctx() ctx: AddMetaCardWizardContext) {
		const msg = ctx.message as Message.PhotoMessage;
		const photos = msg.photo;
		const largest = photos[photos.length - 1];

		ctx.wizard.state.fileId = largest.file_id;
		ctx.wizard.state.fileUniqueId = largest.file_unique_id;

		await ctx.reply(
			`Фото file_id:\n${largest.file_id}\n\nТеперь введите имя файла вида meta-card-{номер}.jpg:`,
		);

		ctx.wizard.next();
	}

	@WizardStep(3)
	@On('text')
	async getFileName(@Ctx() ctx: AddMetaCardWizardContext) {
		const message = ctx.message as Message.TextMessage;
		const fileName = message?.text?.trim();

		if (!fileName) {
			await ctx.reply('Имя файла не может быть пустым. Пожалуйста, введите имя файла:');
			return;
		}

		ctx.wizard.state.filePath = `${META_CARDS_FOLDER_NAME}/${fileName}`;

		const { filePath, fileId, fileUniqueId } = ctx.wizard.state;

		const mediaDto: CreateMediaDto = {
			fileName,
			filePath,
			fileId,
			fileUniqueId,
			type: MediaType.PHOTO,
		};

		await this.mediaService.saveToPublicDir(ctx, fileId, filePath, MediaType.PHOTO);
		const media = await this.mediaService.saveMedia(mediaDto);

		ctx.wizard.state.mediaId = media.id;

		await ctx.reply(TEXTS.ENTER_TITLE);

		ctx.wizard.next();
	}

	@WizardStep(4)
	@On('text')
	async getTitle(@Ctx() ctx: AddMetaCardWizardContext) {
		const message = ctx.message as Message.TextMessage;
		const title = message?.text?.trim();

		if (!title) {
			await ctx.reply('Заголовок не может быть пустым. Пожалуйста, введите заголовок:');
			return;
		}

		ctx.wizard.state.title = title;

		await ctx.reply(TEXTS.ENTER_QUESTIONS);
		ctx.wizard.next();
	}

	@WizardStep(5)
	@On('text')
	async getContent(@Ctx() ctx: AddMetaCardWizardContext) {
		const message = ctx.message as Message.TextMessage;
		const questionsText = message?.text?.trim();

		if (!questionsText) {
			await ctx.reply('Вопросы не могут быть пустыми. Пожалуйста, введите вопросы:');
			return;
		}

		const questions = questionsText
			.split('\n')
			.filter(Boolean)
			.map((question) => question.trim());

		if (questions.length === 0) {
			await ctx.reply(
				'Не удалось распознать вопросы. Пожалуйста, введите вопросы, разделяя их символом новой строки:',
			);
			return;
		}

		try {
			const { title, mediaId } = ctx.wizard.state;

			if (!mediaId) {
				await ctx.reply('Не удалось распознать * mediaId *');
				return;
			}

			const metaCardDto: CreateMetaCardDto = {
				title,
				questions,
				mediaId,
			};

			const metaCard = await this.metaCardService.create(metaCardDto);

			await ctx.reply(`${TEXTS.META_CARD_ADDED}\nЗаголовок: ${metaCard.title}\nID: ${metaCard.id}`);

			const metaCardQuestions = metaCard.questions.join('\n\n');

			await this.mediaService.sendPhoto(ctx, metaCard.media.filePath);

			await ctx.reply(metaCardQuestions, { parse_mode: 'MarkdownV2' });

			ctx.wizard.next();
			return this.finishStep(ctx);
		} catch (err) {
			console.error(err);
			await ctx.reply(TEXTS.ADDING_ERROR);
		}
	}

	@WizardStep(6)
	async finishStep(@Ctx() ctx: AddMetaCardWizardContext) {
		const buttons = [
			Markup.button.callback(TEXTS.ADD_NEW_META_CARD, BaseCallback.Restart),
			...this.sceneButtons,
		];

		await ctx.reply(TEXTS.AFTER_CREATION, Markup.inlineKeyboard(buttons, { columns: 1 }));
	}

	@Action(SceneCommand.GO_TO_ADMIN)
	async onGoToAdmin(@Ctx() ctx: AddMetaCardWizardContext) {
		this.toggleSkipSceneLeave(ctx, true);

		await ctx.answerCbQuery();
		await ctx.scene.leave();
		return ctx.scene.enter(BotScene.Admin);
	}

	get goToAdminButton() {
		return Markup.button.callback(TEXTS.GO_TO_ADMIN, SceneCommand.GO_TO_ADMIN);
	}

	get sceneButtons() {
		return [this.goToAdminButton, this.homeButton];
	}
}
