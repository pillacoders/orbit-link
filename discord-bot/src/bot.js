require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

// ─── Commands ───
const commands = [
  new SlashCommandBuilder().setName('verify').setDescription('Verify your OrbitLink account').addStringOption(o => o.setName('username').setDescription('Your OrbitLink username').setRequired(true)),
  new SlashCommandBuilder().setName('stats').setDescription('View your OrbitLink stats'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('View the global leaderboard'),
  new SlashCommandBuilder().setName('epoch').setDescription('View current epoch info'),
  new SlashCommandBuilder().setName('referral').setDescription('Get your referral link'),
  new SlashCommandBuilder().setName('announce').setDescription('Send an announcement (Admin only)').addStringOption(o => o.setName('title').setDescription('Title').setRequired(true)).addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
];

// ─── Bot Setup ───
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// ─── Embed Helpers ───
function orbitEmbed() {
  return new EmbedBuilder()
    .setColor(0x7551FF)
    .setFooter({ text: 'OrbitLink • Decentralized Bandwidth Sharing' })
    .setTimestamp();
}

// ─── Events ───
client.once('ready', async () => {
  console.log(`✅ OrbitLink Bot online as ${client.user.tag}`);
  console.log(`📡 Serving ${client.guilds.cache.size} guilds`);

  // Register slash commands
  try {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    console.log('🔄 Registering slash commands...');
    
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID), { body: commands.map(c => c.toJSON()) });
    } else {
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands.map(c => c.toJSON()) });
    }
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === 'verify') {
      const username = interaction.options.getString('username');
      const embed = orbitEmbed()
        .setTitle('✅ Verification Submitted')
        .setDescription(`Username **${username}** has been submitted for verification.\n\nPlease complete verification on the [OrbitLink Dashboard](http://localhost:3000/dashboard/tasks).`)
        .addFields({ name: 'Discord ID', value: interaction.user.id, inline: true }, { name: 'Username', value: username, inline: true });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (commandName === 'stats') {
      const embed = orbitEmbed()
        .setTitle('📊 Your OrbitLink Stats')
        .setDescription('Connect your account on the dashboard to view detailed stats here.')
        .addFields(
          { name: '🔗 Dashboard', value: '[View Dashboard](http://localhost:3000/dashboard)', inline: true },
          { name: '📥 Extension', value: '[Install Extension](http://localhost:3000)', inline: true },
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (commandName === 'leaderboard') {
      try {
        const res = await fetch(`${API_URL}/leaderboard?page=1&limit=10`);
        const data = await res.json();
        const lb = data.data?.leaderboard || [];

        const medals = ['🥇', '🥈', '🥉'];
        const lines = lb.map((u, i) => `${i < 3 ? medals[i] : `\`${i + 1}.\``} **${u.username}** — \`${Math.round(u.totalPoints).toLocaleString()}\` pts`).join('\n');

        const embed = orbitEmbed()
          .setTitle('🏆 Global Leaderboard — Top 10')
          .setDescription(lines || 'No users yet.')
          .addFields({ name: '📊 Full Leaderboard', value: '[View All](http://localhost:3000/dashboard/leaderboard)' });
        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        await interaction.reply({ content: '❌ Failed to fetch leaderboard. Is the server running?', ephemeral: true });
      }
    }

    else if (commandName === 'epoch') {
      try {
        const res = await fetch(`${API_URL}/epochs/active`, { headers: { 'Authorization': 'Bearer stub' } });
        const data = await res.json();
        const epoch = data.data;

        if (!epoch) {
          await interaction.reply({ content: 'No active epoch currently.', ephemeral: true });
          return;
        }

        const embed = orbitEmbed()
          .setTitle(`⏱️ ${epoch.name}`)
          .setDescription(epoch.description || 'Current active epoch')
          .addFields(
            { name: 'Multiplier', value: `**${epoch.multiplier}x**`, inline: true },
            { name: 'Points Pool', value: `**${epoch.totalPointsPool?.toLocaleString()}**`, inline: true },
            { name: 'Ends', value: new Date(epoch.endDate).toLocaleDateString(), inline: true },
          );
        await interaction.reply({ embeds: [embed] });
      } catch (err) {
        await interaction.reply({ content: '❌ Failed to fetch epoch data.', ephemeral: true });
      }
    }

    else if (commandName === 'referral') {
      const embed = orbitEmbed()
        .setTitle('🤝 Refer Friends & Earn')
        .setDescription('Get your referral link from the dashboard and earn **100 pts** per signup + **10%** of their earnings!')
        .addFields({ name: '🔗 Get Your Link', value: '[Dashboard → Referrals](http://localhost:3000/dashboard/referrals)' });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (commandName === 'announce') {
      if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        return;
      }
      const title = interaction.options.getString('title');
      const message = interaction.options.getString('message');
      const embed = orbitEmbed()
        .setTitle(`📢 ${title}`)
        .setDescription(message)
        .setColor(0x00D4E8);
      await interaction.reply({ embeds: [embed] });
    }

  } catch (err) {
    console.error('Command error:', err);
    await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
  }
});

// ─── Login ───
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN not set in .env');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
