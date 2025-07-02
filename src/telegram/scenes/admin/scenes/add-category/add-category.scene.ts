import { Role } from '@prisma/__generated__';
import { Action, Ctx, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { Message } from 'telegraf/typings/core/types/typegram';

import { SceneCommand } from './constants';
import { TEXTS } from './texts';
import { AddCategoryWizardContext } from './types';

import { Roles } from '@/common/decorators';
import { MainMenuService, MediaService } from '@/common/services';
import { CategoryService } from '@/modules/category';
import { CreateCategoryDto } from '@/modules/category/dto/create-category.dto';
import { ChapterService } from '@/modules/chapter';
import { BotScene } from '@/telegram/constants';
import { BaseCallback, BaseWizardScene } from '@/telegram/scenes/base';

@Roles(Role.ADMIN)
@Wizard(BotScene.AddCategory)
export class AddCategoryWizard extends BaseWizardScene<AddCategoryWizardContext> {
	constructor(
		private readonly categoryService: CategoryService,
		private readonly chapterService: ChapterService,
		protected readonly mainMenuService: MainMenuService,
		protected readonly mediaService: MediaService,
	) {
		super(mainMenuService, mediaService);
	}

	@WizardStep(1)
	async start(@Ctx() ctx: AddCategoryWizardContext) {
		try {
			await ctx.reply(TEXTS.INTRO);

			const chapters = await this.chapterService.getAllChapters();

			if (!chapters || chapters.length === 0) {
				await this.sendOrEdit(ctx, TEXTS.NO_CHAPTERS, this.sceneButtons, 'MarkdownV2', true);
				return;
			}

			ctx.wizard.state.chapters = chapters.map((chapter) => ({
				id: chapter.id,
				name: chapter.name,
			}));

			const buttons = chapters.map((chapter) =>
				Markup.button.callback(chapter.name, `${SceneCommand.SELECT_CHAPTER}:${chapter.id}`),
			);

			buttons.push(...this.sceneButtons);

			await this.sendOrEdit(ctx, TEXTS.SELECT_CHAPTER, buttons, undefined, true);
		} catch (error) {
			console.error(error);
			await ctx.reply(TEXTS.CREATION_ERROR);
			return ctx.scene.leave();
		}
	}

	@Action(new RegExp(`^${SceneCommand.SELECT_CHAPTER}:(.+)$`))
	async onSelectChapter(@Ctx() ctx: AddCategoryWizardContext) {
		const chapterId = ctx.match[1];

		if (!chapterId) {
			await ctx.answerCbQuery(TEXTS.INVALID_CHAPTER);
			return;
		}

		ctx.wizard.state.chapterId = chapterId;

		const chapterName =
			ctx.wizard.state.chapters?.find((chapter) => chapter.id === chapterId)?.name || 'Unknown';

		await ctx.answerCbQuery(`Выбрана глава: ${chapterName}`);
		await ctx.reply(`Выбрана глава: ${chapterName}`);

		await ctx.reply(TEXTS.ENTER_NAME);

		ctx.wizard.next();
	}

	@WizardStep(2)
	@On('text')
	async getName(@Ctx() ctx: AddCategoryWizardContext) {
		const message = ctx.message as Message.TextMessage;
		const name = message?.text?.trim();

		if (!name) {
			await ctx.reply('Название не может быть пустым. Пожалуйста, введите название категории:');
			return;
		}

		ctx.wizard.state.name = name;
		ctx.wizard.next();

		await this.createCategory(ctx);
	}

	@WizardStep(3)
	async createCategory(@Ctx() ctx: AddCategoryWizardContext) {
		try {
			const { name, chapterId } = ctx.wizard.state;

			if (!name || !chapterId) {
				await ctx.reply('Отсутствуют обязательные поля. Пожалуйста, начните заново.');
				return this.reenterScene(ctx);
			}

			const createCategoryDto: CreateCategoryDto = {
				name,
				chapterId,
			};

			const category = await this.categoryService.createCategory(createCategoryDto);

			await ctx.reply(`${TEXTS.CATEGORY_CREATED}\nНазвание: ${category.name}\nID: ${category.id}`);

			const keyboard = Markup.inlineKeyboard(
				[
					Markup.button.callback(TEXTS.CREATE_NEW_CATEGORY, BaseCallback.Restart),
					...this.sceneButtons,
				],
				{ columns: 1 },
			);

			await ctx.reply(TEXTS.AFTER_CREATION, keyboard);
		} catch (err) {
			console.error(err);
			await ctx.reply(TEXTS.CREATION_ERROR);
			return ctx.scene.leave();
		}
	}

	@Action(SceneCommand.GO_TO_ADMIN)
	async onGoToAdmin(@Ctx() ctx: AddCategoryWizardContext) {
		this.toggleSkipSceneLeave(ctx, true);

		await ctx.answerCbQuery();
		await this.onLeave(ctx);
		return ctx.scene.enter(BotScene.Admin);
	}

	get goToAdminButton() {
		return Markup.button.callback(TEXTS.GO_TO_ADMIN, SceneCommand.GO_TO_ADMIN);
	}

	get sceneButtons() {
		return [this.goToAdminButton, this.homeButton];
	}
}
