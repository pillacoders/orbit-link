import { prisma } from '../config/database';

export class TelegramBotService {
  private static botToken = process.env.TELEGRAM_BOT_TOKEN;
  private static isRunning = false;
  private static offset = 0;

  static async start() {
    // 1. Check if token is available
    if (!this.botToken) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set in environment variables. Telegram verification flow will not poll live updates.');
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;

    console.log('🤖 Telegram Bot Service initialized. Starting update polling...');

    // 2. Automatically update the task URLs in the database to the private Telegram channel link
    try {
      const updatedCount = await prisma.task.updateMany({
        where: { type: 'TELEGRAM' },
        data: {
          title: 'Join Private Telegram Channel',
          url: 'https://t.me/+RNJZ44Y2BG81OTQ9',
          description: 'Join our private Telegram channel to receive exclusive updates and verify your membership.'
        }
      });
      console.log(`🤖 Telegram Bot Service: Updated ${updatedCount.count} Telegram tasks to private channel URL.`);
    } catch (err) {
      console.error('❌ Failed to update Telegram task URLs:', err);
    }

    // 3. Start polling loop
    this.poll();
  }

  private static async poll() {
    if (!this.isRunning) return;

    try {
      const allowedUpdates = JSON.stringify(['chat_join_request', 'chat_member']);
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.offset}&timeout=30&allowed_updates=${allowedUpdates}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Telegram API responded with HTTP status ${response.status}`);
      }

      const data = (await response.json()) as any;
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          // Update the offset to be the latest update_id + 1
          this.offset = Math.max(this.offset, update.update_id + 1);
          await this.processUpdate(update);
        }
      }
    } catch (error: any) {
      console.error('❌ Error polling Telegram updates:', error.message || error);
      // Wait 5 seconds before retrying to prevent rapid failure loops
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Continue the polling loop
    if (this.isRunning) {
      setImmediate(() => this.poll());
    }
  }

  private static async processUpdate(update: any) {
    // Check for chat_join_request
    if (update.chat_join_request) {
      const { from } = update.chat_join_request;
      if (from && from.username) {
        await this.recordJoinRequest(from.username, String(from.id));
      }
    }
    // Fallback: Check for chat_member changes (in case of manual add or existing members)
    else if (update.chat_member) {
      const { from } = update.chat_member;
      if (from && from.username) {
        await this.recordJoinRequest(from.username, String(from.id));
      }
    }
  }

  private static async recordJoinRequest(username: string, userId: string) {
    const normalizedUsername = username.toLowerCase().trim().replace(/^@/, '');
    if (!normalizedUsername) return;

    try {
      await prisma.telegramJoinRequest.upsert({
        where: { telegramUsername: normalizedUsername },
        update: { telegramUserId: userId },
        create: { telegramUsername: normalizedUsername, telegramUserId: userId },
      });
      console.log(`🤖 Telegram Bot: Recorded request from username: @${normalizedUsername} (ID: ${userId})`);
    } catch (err) {
      console.error(`❌ Error recording telegram request for @${normalizedUsername}:`, err);
    }
  }

  static stop() {
    this.isRunning = false;
    console.log('🤖 Telegram Bot Service stopped.');
  }
}
