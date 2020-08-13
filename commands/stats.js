const Discord = require("discord.js")
const config = require("./../config.json")
const os = require('os')
const cpuStat = require("cpu-stat")

module.exports = {
  	name: 'stats',
  	description: '*Mostra le statistiche su AlweNoBot* ***[SOLO PER IL PROPRIETARIO]***',
  	aliases: ['st'],
  	category: 'Info',
  	usage: '',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: false,
    ownerOnly: true,
    examples: ['stats', 'st'],
    args: 0,
    execute(message, args) {
        if (message.author.id !== config.ownerID) {
            const noown = new Discord.MessageEmbed()
                .setColor(0xC80000)
                .setDescription("⛔ ***Non hai accesso a questo comando, poichè non sei il creatore di AlweNoBot.***")
            message.channel.send(noown)
        } else {
            let totalSeconds = (message.client.uptime / 1000)
            let hours = Math.floor(totalSeconds / 3600)
            totalSeconds %= 3600
            let minutes = Math.floor(totalSeconds / 60)
            let seconds = (totalSeconds % 60).toFixed(0)
            if (hours < 10) hours = "0" + hours
            if (minutes < 10) minutes = "0" + minutes
            if (seconds < 10) seconds = "0" + seconds
            let uptime = `${hours}:${minutes}:${seconds}`
            cpuStat.usagePercent(function(err, percent, seconds) {
                let embedStats = new Discord.MessageEmbed()
                    .setColor(0x00AE86)
                    .setTitle("***Statistiche AlweNoBot***")
                    .addField("Proprietario", `**Alwe#1059**`, true)
                    .addField("Tempo acceso", `${uptime}`, true)
                    .addField("Uso RAM", `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`, true)
                    .addField("Uso CPU", `${percent.toFixed(2)} %`, true)
                    .addField("Utenti", `${message.client.users.cache.size - 1}`, true)
                    .addField("Canali ", `${message.client.channels.cache.size}`, true)
                    .addField("Servers", `${message.client.guilds.cache.size}`, true)
                    .addField("Versione Discord.js", `v${Discord.version}`, true)
                    .addField("Versione Node.js", `${process.version}`, true)
                message.channel.send(embedStats)
            })
        }
    },
}
