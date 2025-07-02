import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, PaymentProvider, PaymentStatus, Prisma } from '@prisma/__generated__';

import { PaymentUtils } from './payment.utils';

import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class PaymentService extends PaymentUtils {
	constructor(private readonly prismaService: PrismaService) {
		super();
	}

	async createInvoiceRecord(
		orderId: string,
		userId: string,
		amountMinor: number,
		currency: Currency,
		provider: PaymentProvider,
	) {
		return this.prismaService.payment.create({
			data: {
				orderId,
				userId,
				amount: new Prisma.Decimal(amountMinor),
				currency,
				provider,
				status: PaymentStatus.PENDING,
			},
		});
	}

	/* ------------------------------------------------------------------
	 * SUCCEEDED ────────────────────────────────────────────────────────
	 * Помечаем платёж как завершённый и сохраняем charge-ID из Telegram.
	 * -----------------------------------------------------------------*/
	async markPaymentSucceeded(
		orderId: string,
		providerPaymentChargeId: string,
		telegramPaymentChargeId: string,
		subscriptionId?: string,
	) {
		const payment = await this.getPaymentByOrderId(orderId);

		if (!payment) {
			throw new NotFoundException('Платеж не найден');
		}

		// если уже SUCCEEDED — повторный веб-хук, просто игнорируем
		if (payment.status === PaymentStatus.SUCCEEDED) {
			return payment;
		}

		return this.prismaService.payment.update({
			where: { orderId },
			data: {
				status: PaymentStatus.SUCCEEDED,
				providerPaymentChargeId,
				telegramPaymentChargeId,
				subscriptionId,
			},
		});
	}

	/* ------------------------------------------------------------------
	 * CANCELED ───────────────────────────────────────────────────────────
	 * Ставим статус CANCELED (отмена пользователем или ошибка).
	 * -----------------------------------------------------------------*/
	async markPaymentCanceled(orderId: string, reason?: string) {
		const payment = await this.getPaymentByOrderId(orderId);

		if (!payment) {
			throw new NotFoundException('Платеж не найден');
		}

		if (payment.status === PaymentStatus.SUCCEEDED) {
			return payment;
		}

		return this.prismaService.payment.update({
			where: { orderId },
			data: {
				status: PaymentStatus.CANCELED,
				providerPaymentChargeId: reason ?? payment.providerPaymentChargeId,
			},
		});
	}

	async cancelAllPending(userId: string) {
		return this.prismaService.payment.updateMany({
			where: {
				userId,
				status: PaymentStatus.PENDING,
			},
			data: { status: PaymentStatus.CANCELED, providerPaymentChargeId: 'Canceled by system' },
		});
	}

	async getPaymentByOrderId(orderId: string) {
		return this.prismaService.payment.findUnique({ where: { orderId } });
	}

	async listUserPayments(userId: string) {
		return this.prismaService.payment.findMany({
			where: { userId },
			orderBy: { createdAt: 'desc' },
		});
	}
}
