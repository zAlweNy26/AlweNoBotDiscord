const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class Ping extends Command {
    constructor() {
        super('ping', {
           aliases: ['ping'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Info',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           description: {
             content: '*Mostra la latenza tra te e il bot in ms (millisecondi)*',
             usage: config.prefix + 'ping',
             examples: [config.prefix + 'ping']
           }
        });
    }

    exec(message) {
      let ping = this.client.util.embed().setColor(mine.colorbynumber(Math.round(this.client.ping))).setTitle("***Pong !***")
        .setDescription(`:ping_pong: \`${Math.round(this.client.ping)} ms !\``)
      message.channel.send({embed: ping});
    }
}

module.exports = Ping;
