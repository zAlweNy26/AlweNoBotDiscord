const Discord = require('discord.js')

module.exports = {
  	name: 'welcome',
  	description: '*Mostra un messaggio di benvenuto per ogni utente che entra*',
  	aliases: ['wm'],
  	category: 'Misc',
  	usage: '[id canale] [messaggio]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['welcome 742811567988539554 Benvenuto {{utente}} !', 'wm 742811567988539554 Ehy {{utente}} !'],
	args: true,
	execute(message, args) {
		if (args[0] == 'delete') {
			message.client.settings.set(message.guild.id, false, "welcome")
			const fwEmbed = new Discord.MessageEmbed()
				.setColor(0xC80000)
				.setDescription(`*Hai eliminato il messaggio di addio !*`)
			return message.channel.send(fwEmbed)
		}
		
		if (isNaN(args[0])) {
			const fwEmbed = new Discord.MessageEmbed()
				.setColor(0xC80000)
				.setDescription(`*Non hai inserito un ID canale valido !*`)
			return message.channel.send(fwEmbed)
		}

		let channelID = args[0]
		args[0] = ''

		message.client.settings.set(message.guild.id, true, "welcome")
		message.client.settings.set(message.guild.id, channelID, "welcomeID")
		message.client.settings.set(message.guild.id, args.join(" "), "welcomeMessage")
		
		message.client.channels.cache.get(channelID).send(args.join(" "))
	},
}