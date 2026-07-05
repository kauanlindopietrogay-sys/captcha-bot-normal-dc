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
const CARGO_ID = "1428549879470362775";
const LOG_CHANNEL_ID = "1523285196873535608";

const captchas = new Map();

// Função central de log — manda embed pro canal configurado
async function enviarLog(titulo, descricao, cor = 0x5865F2) {
  try {
    const canal = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!canal) return console.error("[LOG] Canal de logs não encontrado.");

    const embed = new EmbedBuilder()
      .setTitle(titulo)
      .setDescription(descricao)
      .setColor(cor)
      .setTimestamp();

    await canal.send({ embeds: [embed] });
  } catch (err) {
    console.error("[LOG] Falha ao enviar log pro canal:", err);
  }
}

client.once("ready", () => {
  console.log(`${client.user.tag} online!`);
  enviarLog("🟢 Bot iniciado", `${client.user.tag} está online.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!captcha") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🔐 Verificação")
      .setDescription("Clique no botão abaixo para iniciar a verificação.");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verificar")
        .setLabel("Verificar")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });

    enviarLog(
      "📋 Painel criado",
      `${message.author.tag} ativou o painel de captcha em <#${message.channel.id}>`
    );
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === "verificar") {
      const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
      captchas.set(interaction.user.id, codigo);

      const modal = new ModalBuilder()
        .setCustomId("captchaModal")
        .setTitle(`Captcha: ${codigo}`);

      const input = new TextInputBuilder()
        .setCustomId("captchaInput")
        .setLabel("Digite o código acima")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.showModal(modal);

      enviarLog(
        "🎲 Captcha gerado",
        `${interaction.user.tag} (${interaction.user.id}) iniciou uma verificação.`
      );
    }

    if (interaction.isModalSubmit() && interaction.customId === "captchaModal") {
      const resposta = interaction.fields.getTextInputValue("captchaInput").toUpperCase();
      const codigo = captchas.get(interaction.user.id);

      if (!codigo) {
        return interaction.reply({
          content: "⚠️ Captcha expirado ou não encontrado. Clique em Verificar novamente.",
          ephemeral: true
        });
      }

      if (resposta === codigo) {
        const membro = interaction.guild.members.cache.get(interaction.user.id);

        try {
          await membro.roles.add(CARGO_ID);
          captchas.delete(interaction.user.id);

          enviarLog(
            "✅ Verificação concluída",
            `${interaction.user.tag} (${interaction.user.id}) passou no captcha.`,
            0x57F287
          );

          return interaction.reply({
            content: "✅ Verificação concluída!",
            ephemeral: true
          });
        } catch (err) {
          enviarLog(
            "🔴 Erro ao dar cargo",
            `Falha ao dar cargo pra ${interaction.user.tag}: \`${err.message}\``,
            0xED4245
          );
          return interaction.reply({
            content: "❌ Erro ao aplicar o cargo. Chama um admin.",
            ephemeral: true
          });
        }
      } else {
        enviarLog(
          "❌ Captcha incorreto",
          `${interaction.user.tag} errou o código (digitou: \`${resposta}\`)`,
          0xFEE75C
        );
        return interaction.reply({
          content: "❌ Código incorreto.",
          ephemeral: true
        });
      }
    }
  } catch (err) {
    console.error("[ERRO GERAL]", err);
  }
});

client.login(TOKEN);
