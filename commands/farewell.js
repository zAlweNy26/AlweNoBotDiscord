const Discord = require('discord.js')

module.exports = {
  	name: 'farewell',
  	description: '*Mostra un messaggio di addio per ogni utente che esce*',
  	aliases: ['fw'],
  	category: 'Info',
  	usage: '[id canale] [messaggio]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['farewell 742811567988539554 Addio {{utente}} !', 'fw 742811567988539554 Arrivederci {{utente}} !'],
	args: true,
	execute(message, args) {
		const fwEmbed = new Discord.MessageEmbed()

		if (args[0] == 'delete') {
			message.client.settings.set(message.guild.id, false, "farewell")
			fwEmbed.setColor(0xC80000).setDescription(`*Hai eliminato il messaggio di addio !*`)
			return message.channel.send(fwEmbed)
		}

		if (isNaN(args[0])) {
			fwEmbed.setColor(0xC80000).setDescription(`*Non hai inserito un ID canale valido !*`)
			return message.channel.send(fwEmbed)
		}

		let channelID = args[0]
		args[0] = ''

		if (!message.guild.channels.cache.some((channel) => channel.id === channelID)) {
			const fwEmbed = new Discord.MessageEmbed()
				.setColor(0xC80000)
				.setDescription(`*Non hai inserito un ID canale esistente !*`)
			return message.channel.send(fwEmbed)
		}

		message.client.settings.set(message.guild.id, true, "farewell")
		message.client.settings.set(message.guild.id, channelID, "farewellID")
		message.client.settings.set(message.guild.id, args.join(" "), "farewellMessage")

		fwEmbed.setColor('#00AE86').setDescription(`*Messaggio di addio creato !*`)
		message.channel.send(fwEmbed)
	},
}