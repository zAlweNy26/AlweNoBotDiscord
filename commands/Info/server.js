const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class Server extends Command {
    constructor() {
        super('server', {
           aliases: ['server', 'sv'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Info',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           description: {
             content: '*Mostra informazioni sul server corrente*',
             usage: config.prefix + 'server',
             examples: [config.prefix + 'server']
           }
        });
    }

    exec(message) {
      let server = this.client.util.embed().setColor(0x00FF00).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
        .setAuthor("Info su " + message.channel.guild.name, this.client.user.avatarURL)
        .setThumbnail(message.channel.guild.iconURL)
        .addField("Server ID", message.channel.guild.id, true)
        .addField("Creato da", `👑 <@${message.channel.guild.ownerID}>`, true)
        .addField("Membri", message.channel.guild.presences.size + " / " + message.channel.guild.members.size + " 👥", true)
        .addField("Ruoli", message.channel.guild.roles.size, true)
        .addField("Canale AFK", message.channel.guild.afkChannel, true)
        .addField("Ospitato in", message.channel.guild.region, true);
      message.channel.send({embed: server});
    }
}

module.exports = Server;
