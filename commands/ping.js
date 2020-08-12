const Discord = require('discord.js')
const mine = require('./../functions.js')

module.exports = {
  	name: 'ping',
  	description: '*Mostra la latenza tra te e il bot in ms (millisecondi)*',
  	aliases: ['p'],
  	category: 'Info',
  	usage: '',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: false,
	ownerOnly: false,
	examples: ['ping', 'p'],
	args: false,
	execute(message, args) {
		message.channel.send("***Pingando AlweNoBot...***").then(msg => {
			let ping = new Discord.MessageEmbed()
				.setColor(mine.colorbynumber(Math.round(message.client.ws.ping)))
				.setTitle("***Pong !***")
				.setDescription(`:ping_pong: \`${Math.round(message.client.ws.ping)} ms !\``)
			msg.edit(ping)
		});
	},
}
