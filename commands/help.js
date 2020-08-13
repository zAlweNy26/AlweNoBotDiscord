const Discord = require('discord.js')

module.exports = {
	name: 'help',
	description: '*Mostra una lista dei comandi di* ***AlweNoBot*** | *Mostra descrizioni avanzate per i comandi di* ***AlweNoBot***',
	aliases: ['h'],
  	category: 'Mod',
  	usage: '<comando>',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	guildOnly: false,
    ownerOnly: false,
    examples: ['h ping'],
    args: -1,
	execute(message, args) {
        const prefix = message.client.settings.get(message.guild.id, "prefix")
		const { commands } = message.client

		if (!args.length) {
            let infocmds = commands.filter(cmd => { if (cmd.category == 'Info') return cmd }).map(command => command.name )
            let misccmds = commands.filter(cmd => { if (cmd.category == 'Misc') return cmd }).map(command => command.name )
            let modecmds = commands.filter(cmd => { if (cmd.category == 'Mod') return cmd }).map(command => command.name )

            const helpEmbed = new Discord.MessageEmbed()
                .setColor('#00AE86')
                .setAuthor(`Comandi totali : ${infocmds.length + misccmds.length + modecmds.length}`, message.client.user.avatarURL)
                .setDescription(`**[ ]** indica **obbligatorio**\n**< >** indica *opzionale*`)
                .addFields(
                    { name: 'Help', value: "**Descrizione :** *Mostra descrizioni avanzate per i comandi di* **AlweNoBot**\n" +
                            `\`${prefix}help\` **|** \`${prefix}help <comando>\`` },
                    { name: 'Informazione', value: `\`${infocmds.join('`**,** `')}\``, inline: true },
                    { name: 'Misti', value: `\`${misccmds.join('`**,** `')}\``, inline: true },
                    { name: 'Moderazione', value: `\`${modecmds.join('`**,** `')}\``, inline: true },
                )
                .setTimestamp()
                .setFooter("Lista generale per i comandi di AlweNoBot")
            message.channel.send(helpEmbed)
        } else {
            const name = args[0].toLowerCase()
            const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name))

            if (!command) {
                return message.reply('**Non hai inserito un comando esistente !**')
            }

            if (command.name == 'help') return

            const helpEmbed = new Discord.MessageEmbed()
                .setColor('#00AE86')
                .setTitle(`\`${prefix}${command.name} ${command.usage}\``)
                .setAuthor(`Comando ${command.name}`, message.client.user.avatarURL)
                .addField('Descrizione', command.description)
                .setTimestamp()
                .setFooter(`Descrizione avanzata di ${command.name}`)

            if (command.aliases.length > 1) helpEmbed.addField('Alias', `\`${command.aliases.join('`**,** `')}\``, true)
            else helpEmbed.addField('Alias', `\`${command.aliases[0]}\``, true)

            if (command.examples.length) helpEmbed.addField('Esempi', `\`${prefix}${command.examples.join(`\`\n\`${prefix}`)}\``, true)

            message.channel.send(helpEmbed)
        }
    },
}