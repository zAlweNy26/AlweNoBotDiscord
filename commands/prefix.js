const Discord = require('discord.js')

module.exports = {
  	name: 'prefix',
  	description: '*Modifica il prefisso per i comandi di AlweNoBot*',
  	aliases: ['p'],
  	category: 'Mod',
  	usage: '[prefisso]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'ADMINISTRATOR'],
	guildOnly: true,
	ownerOnly: false,
	examples: ['prefix z!', 'prefix a-'],
	args: 1,
	execute(message, args) {
		if (!isNaN(args[0])) {
            return message.reply('**Non hai inserito un prefisso valido !**')
        }
		let prevPrefix = message.client.settings.get(message.guild.id, "prefix")
		message.client.settings.set(message.guild.id, args[0], "prefix")
		const prefEmbed = new Discord.MessageEmbed()
			.setColor('#00AE86')
			.setDescription(`*Il nuovo prefisso per i comandi di* ***AlweNoBot*** *è stato impostato da \`${prevPrefix}\` a \`${args[0]}\` !*`)
		message.channel.send(prefEmbed)
	},
}