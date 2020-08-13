const Discord = require('discord.js')

module.exports = {
  	name: 'farewell',
  	description: '*Mostra un messaggio di addio per ogni utente che esce*',
  	aliases: ['fw'],
  	category: 'Misc',
  	usage: '[id canale] [messaggio]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['farewell 742811567988539554 Addio {{utente}} !', 'fw 742811567988539554 Arrivederci {{utente}} !'],
	args: true,
	execute(message, args) {
		if (args[0] == 'delete') {
			message.client.settings.set(message.guild.id, false, "farewell")
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

		message.client.settings.set(message.guild.id, true, "farewell")
		message.client.settings.set(message.guild.id, channelID, "farewellID")
		message.client.settings.set(message.guild.id, args.join(" "), "farewellMessage")
		
		message.client.channels.cache.get(channelID).send(args.join(" "))
	},
}