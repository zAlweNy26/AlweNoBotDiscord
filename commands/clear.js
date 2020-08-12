const Discord = require('discord.js')

module.exports = {
	name: 'clear',
    description: '*Cancella un numero specifico di messaggi nel canale in cui viene eseguito*',
    aliases: ['cl'],
    category: 'Mod',
    usage: '[numero]',
    userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_MESSAGES'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['clear 5', 'clear 126'],
    args: true,
    execute(message, args) {
        const amount = parseInt(args[0])

        if (isNaN(amount)) {
            return message.reply('**Non hai inserito un numero valido !**')
        } else if (amount < 1 || amount > 500) {
            return message.reply('**Devi inserire un numero tra 1 e 500 !**')
        }

        message.channel.bulkDelete(amount + 1, true).then(messages => {
            const delEmbed = new Discord.MessageEmbed()
                .setColor('#00AE86')
                .setDescription(`*Messaggi eliminati in totale :* **${amount}** ✅`)
            message.channel.send(delEmbed)
            setTimeout(() => { message.channel.bulkDelete(1).catch(err => { console.error(err) }) }, 2000)
        }).catch(err => {
            console.error(err)
            message.channel.send("**Non è stato possibile cancellare i messaggi in questo canale !**")
        })
	  },
}