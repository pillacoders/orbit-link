import { prisma } from '../config/database';

export class DiscordService {
  private static clientId = process.env.DISCORD_CLIENT_ID;
  private static clientSecret = process.env.DISCORD_CLIENT_SECRET;
  private static botToken = process.env.DISCORD_BOT_TOKEN;
  private static guildId = process.env.DISCORD_GUILD_ID || '1508438588428390532';
  private static redirectUri = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/dashboard/tasks';

  /**
   * Automatically updates any existing DISCORD type tasks in the database
   * to point to the correct invite URL.
   */
  static async syncTaskUrl() {
    try {
      const updatedCount = await prisma.task.updateMany({
        where: { type: 'DISCORD' },
        data: {
          title: 'Join OrbitLink Discord Server',
          url: 'https://discord.gg/yB3A5GbRTX',
          description: 'Join the OrbitLink community on Discord and authorize your account to verify your membership.'
        }
      });
      console.log(`🎮 Discord Service: Updated ${updatedCount.count} Discord tasks to the invite URL.`);

      // Update Twitter Tasks
      const updatedTwitterCount = await prisma.task.updateMany({
        where: { type: 'TWITTER' },
        data: {
          title: 'Follow on Twitter/X',
          url: 'https://x.com/OrbitLinkNode',
          description: 'Follow @OrbitLinkNode on Twitter/X to complete this task.'
        }
      });
      console.log(`🎮 Discord Service: Updated ${updatedTwitterCount.count} Twitter tasks to the X profile URL.`);
    } catch (err) {
      console.error('❌ Failed to sync Discord/Twitter tasks invite URL:', err);
    }
  }

  /**
   * Exchanges an authorization code for a Discord user access token
   */
  private static async getAccessToken(code: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Discord Client ID or Client Secret is not configured.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
    });

    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('❌ Discord token exchange failed:', errBody);
      throw new Error('Failed to exchange authorization code for Discord token.');
    }

    const data = (await response.json()) as any;
    return data.access_token;
  }

  /**
   * Fetches the user profile from Discord using the user access token
   */
  private static async getUserProfile(accessToken: string): Promise<{ id: string; username: string; email?: string }> {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve user profile from Discord.');
    }

    return (await response.json()) as any;
  }

  /**
   * Checks if the user is in the Discord guild. If they are not,
   * it uses the guilds.join scope to automatically add them to the guild.
   */
  static async verifyGuildMembership(code: string): Promise<{ discordId: string; discordUsername: string }> {
    if (!this.botToken) {
      throw new Error('Discord Bot Token is not configured on the server.');
    }

    // 1. Get access token from code
    const accessToken = await this.getAccessToken(code);

    // 2. Fetch the user profile (includes user ID)
    const discordUser = await this.getUserProfile(accessToken);
    const userId = discordUser.id;

    console.log(`🎮 Discord Service: Verifying guild membership for @${discordUser.username} (ID: ${userId})`);

    // 3. Try to get the guild member via Discord Bot API
    const memberCheckUrl = `https://discord.com/api/v10/guilds/${this.guildId}/members/${userId}`;
    const checkResponse = await fetch(memberCheckUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bot ${this.botToken}`,
      },
    });

    if (checkResponse.ok) {
      console.log(`🎮 Discord Service: User @${discordUser.username} is already a member of guild ${this.guildId}`);
      return { discordId: userId, discordUsername: discordUser.username };
    }

    // 4. If not a member (404), automatically add them to the server using PUT
    if (checkResponse.status === 404) {
      console.log(`🎮 Discord Service: User @${discordUser.username} is not in the guild. Automatically adding them...`);
      
      const addResponse = await fetch(memberCheckUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
        }),
      });

      // 201: Created (successfully joined)
      // 204: No Content (already in server, but we checked anyway)
      if (addResponse.ok || addResponse.status === 201 || addResponse.status === 204) {
        console.log(`🎮 Discord Service: Successfully added @${discordUser.username} to guild ${this.guildId}`);
        return { discordId: userId, discordUsername: discordUser.username };
      }

      const errText = await addResponse.text();
      console.error(`❌ Discord Service: Failed to add user to guild:`, errText);
      throw new Error(`Please join the Discord server manually first at: https://discord.gg/yB3A5GbRTX`);
    }

    throw new Error('Failed to verify Discord guild membership.');
  }
}
