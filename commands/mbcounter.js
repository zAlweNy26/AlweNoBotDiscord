const Discord = require('discord.js')

module.exports = {
  	name: 'mbcounter',
  	description: '*Crea un counter dei membri del server in un canale vocale*',
  	aliases: ['mbc'],
  	category: 'Info',
  	usage: '[id canale] [messaggio]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['mbc 742811567988539554 👥Membri : {{membri}}'],
	args: -1,
	execute(message, args) {
		const mbcEmbed = new Discord.MessageEmbed()

		if (args[0] == 'delete') {
			message.client.settings.set(message.guild.id, false, "farewell")
			mbcEmbed.setColor(0xC80000).setDescription(`*Hai eliminato il messaggio di addio !*`)
			return message.channel.send(mbcEmbed)
		}

		if (isNaN(args[0])) {
			mbcEmbed.setColor(0xC80000).setDescription(`*Non hai inserito un ID canale valido !*`)
			return message.channel.send(mbcEmbed)
		}

		let channelID = args[0]
		args[0] = ''

		if (!message.guild.channels.cache.some((channel) => channel.id === channelID)) {
			mbcEmbed.setColor(0xC80000).setDescription(`*Non hai inserito un ID canale esistente !*`)
			return message.channel.send(mbcEmbed)
		}

		message.client.settings.set(message.guild.id, true, "membersInChannel")
		message.client.settings.set(message.guild.id, channelID, "membersInChannelID")
		message.client.settings.set(message.guild.id, args.join(" "), "membersInChannelMessage")

		mbcEmbed.setColor('#00AE86').setDescription(`*Counter dei membri creato !*`)
		message.channel.send(mbcEmbed)
		setTimeout(() => { message.channel.bulkDelete(1).catch(err => { console.error(err) }) }, 2000)
	},
}