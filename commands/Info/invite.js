const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");

class Invite extends Command {
    constructor() {
        super('invite', {
           aliases: ['invite', 'inv'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Info',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           description: {
             content: '*Mostra il link di invito del bot per aggiungerlo ad altri server*',
             usage: config.prefix + 'invite',
             examples: [config.prefix + 'invite']
           }
        });
    }

    async fetchInvite() {
  		if (this.invite) return this.invite;
  		const invite = await this.client.generateInvite(['ADMINISTRATOR']);
  		this.invite = invite;
  		return invite;
    }

    async exec(message) {
      let inv = this.client.util.embed().setColor(0x00AE86)
        .setDescription(`***Invita AlweNoBot nel tuo server grazie a questo link :***\n\n${await this.fetchInvite()}`)
      message.channel.send({embed: inv});
    }
}

module.exports = Invite;
