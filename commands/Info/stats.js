const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const aka = require('discord-akairo').version;
const dis= require("discord.js").version;
const Discord = require("discord.js");
const os = require('os');
const cpuStat = require("cpu-stat");

class BotStats extends Command {
    constructor() {
        super('stats', {
           aliases: ['stats'],
           ownerOnly: true,
           channelRestriction: 'dm',
           category: 'Info',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           description: {
             content: '*Mostra le statistiche su AlweNoBot* ***[SOLO PER IL PROPRIETARIO]***',
             usage: config.prefix + 'stats',
             examples: [config.prefix + 'stats']
           }
        });
    }

    exec(message) {
      let bot = this.client;
      if (message.author.id !== config.ownerID) {
				let noown = bot.util.embed().setColor(0xC80000)
					.setDescription("⛔ ***Non hai accesso a questo comando, poichè non sei il creatore di AlweNoBot.***")
				message.channel.send({embed: noown});
			} else {
				let totalSeconds = (this.client.uptime / 1000);
				let hours = Math.floor(totalSeconds / 3600);
				totalSeconds %= 3600;
				let minutes = Math.floor(totalSeconds / 60);
				let seconds = (totalSeconds % 60).toFixed(0);
				if (hours < 10) hours = "0" + hours;
				if (minutes < 10) minutes = "0" + minutes;
				if (seconds < 10) seconds = "0" + seconds;
				let uptime = `${hours}:${minutes}:${seconds}`;
        cpuStat.usagePercent(function(err, percent, seconds) {
          let embedStats = bot.util.embed().setTitle("***Statistiche AlweNoBot***").setColor(0x00AE86)
            .addField("Uso RAM", `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`, true)
            .addField("Tempo acceso", `${uptime}`, true)
  					.addField("Uso CPU", `${percent.toFixed(2)} %`, true)
            .addField("Utenti", `${bot.users.size - 1}`, true)
            .addField("Canali ", `${bot.channels.size}`, true)
  					.addField("Servers", `${bot.guilds.size}`, true)
            .addField("Versione Discord.js", `v${dis}`, true)
            .addField("Versione Discord-Akairo", `v${aka}`, true)
            .addField("Node", `${process.version}`, true)
          message.channel.send({embed: embedStats});
	    	});
			}
    }
}

module.exports = BotStats;
