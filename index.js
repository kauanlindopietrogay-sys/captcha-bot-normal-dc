require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;
const ROLE_ID = "1428549879470362775";
const LOG_CHANNEL_ID = "1523285196873535608";

const captchas = new Map();

// Central log function — sends an embed to the configured channel
async function sendLog(title, description, color = 0x5865F2) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!channel) return console.error("[LOG] Log channel not found.");

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("[LOG] Failed to send log to channel:", err);
  }
}

client.once("ready", () => {
  console.log(`${client.user.tag} online!`);
  sendLog("🟢 Bot started", `${client.user.tag} is online.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!captcha") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🔐 Verification")
      .setDescription("Click the button below to start verification.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify")
        .setLabel("Verify")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });

    sendLog(
      "📋 Panel created",
      `${message.author.tag} triggered the captcha panel in <#${message.channel.id}>`
    );
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === "verify") {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      captchas.set(interaction.user.id, code);

      const modal = new ModalBuilder()
        .setCustomId("captchaModal")
        .setTitle(`Captcha: ${code}`);

      const input = new TextInputBuilder()
        .setCustomId("captchaInput")
        .setLabel("Type the code above")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.showModal(modal);

      sendLog(
        "🎲 Captcha generated",
        `${interaction.user.tag} (${interaction.user.id}) started a verification.`
      );
    }

    if (interaction.isModalSubmit() && interaction.customId === "captchaModal") {
      const answer = interaction.fields.getTextInputValue("captchaInput").toUpperCase();
      const code = captchas.get(interaction.user.id);

      if (!code) {
        return interaction.reply({
          content: "⚠️ Captcha expired or not found. Click Verify again.",
          ephemeral: true
        });
      }

      if (answer === code) {
        const member = interaction.guild.members.cache.get(interaction.user.id);

        try {
          await member.roles.add(ROLE_ID);
          captchas.delete(interaction.user.id);

          sendLog(
            "✅ Verification completed",
            `${interaction.user.tag} (${interaction.user.id}) passed the captcha.`,
            0x57F287
          );

          return interaction.reply({
            content: "✅ Verification completed!",
            ephemeral: true
          });
        } catch (err) {
          sendLog(
            "🔴 Error assigning role",
            `Failed to assign role to ${interaction.user.tag}: \`${err.message}\``,
            0xED4245
          );
          return interaction.reply({
            content: "❌ Error applying the role. Contact an admin.",
            ephemeral: true
          });
        }
      } else {
        sendLog(
          "❌ Incorrect captcha",
          `${interaction.user.tag} entered the wrong code (typed: \`${answer}\`)`,
          0xFEE75C
        );
        return interaction.reply({
          content: "❌ Incorrect code.",
          ephemeral: true
        });
      }
    }
  } catch (err) {
    console.error("[GENERAL ERROR]", err);
  }
});

client.login(TOKEN);
