const Discord = require('discord.js')

module.exports = {
  	name: 'mbcounter',
  	description: '*Crea un counter dei membri del server in un canale vocale*',
  	aliases: ['mbc'],
  	category: 'Misc',
  	usage: '[id canale] [messaggio]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['mbc 742811567988539554 👥Membri : {{membri}}'],
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

		if (message.guild.channels.cache.exists('id', channelID)) {
			const fwEmbed = new Discord.MessageEmbed()
				.setColor(0xC80000)
				.setDescription(`*Non hai inserito un ID canale esistente !*`)
			return message.channel.send(fwEmbed)
		}

		message.client.settings.set(message.guild.id, true, "membersInChannel")
		message.client.settings.set(message.guild.id, channelID, "membersInChannelID")
		message.client.settings.set(message.guild.id, args.join(" "), "membersInChannelMessage")
	},
}