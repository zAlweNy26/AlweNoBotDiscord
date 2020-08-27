const Discord = require('discord.js')
const ytdl = require('ytdl-core');

let isPlaying = false, isMusicOn = false

module.exports = {
    name: 'cvem',
  	description: '*Avvia il gioco "Chi vuol essere milionario ?" con il tempo scelto per ogni domanda*',
  	aliases: ['cvem'],
    category: 'Misc',
    usage: '<tempo>',
    userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['cvem 60', 'cvem'],
    args: 0,
    execute(message, args) {
        let timer
        if (isPlaying) {
            let err = new Discord.MessageEmbed().setColor('#C80000')
                .setDescription(`***C'è già una partita in corso !***`)
            return message.channel.send(err)
        }
        if (!args.length) timer = 120
        else {
            if (isNaN(parseInt(args[0]))) {
                let err = new Discord.MessageEmbed().setColor('#C80000')
                    .setDescription(`***Non hai inserito un numero valido !***`)
                return message.channel.send(err)
            }
            if (parseInt(args[0]) > 120) {
                let err = new Discord.MessageEmbed().setColor('#C80000')
                    .setDescription(`***Non puoi inserire un intervallo di tempo superiore ai 2 minuti !***`)
                return message.channel.send(err)
            }
            timer = parseInt(args[0])
        }
        isPlaying = true
        var voiceChannel = message.member.voice.channel
        var connection, dispatcher
        voiceChannel.join().then(ctn => {
            connection = ctn
            dispatcher = ctn.play(ytdl("https://www.youtube.com/watch?v=_AoF-jZb43U"))
            
            dispatcher.on("finish", () => {
                isMusicOn = false
            })
        }).catch(err => console.log(err))
        const hcvem = new Discord.MessageEmbed()
            .setColor('#2A2D50')
            .setAuthor(`Ecco ciò che puoi fare, Gerry ! `)
            .addField("👤", "SCEGLI UN GIOCATORE", true)
            .addField("❔", "DOMANDA AL GIOCATORE", true)
            .addField("🚫", "FINISCI LA PARTITA", true)
            .addField("🪓", "AIUTO 50 E 50", true)
            .addField("☎️", "AIUTO DA CASA", true)
            .addField("👥", "AIUTO DAL PUBBLICO", true)
            .addField("✅", "RISPOSTA ESATTA", true)
            .addField("❌", "RISPOSTA ERRATA", true)
            .addField("⁉️", "RISPOSTA DEFINITIVA", true)
        message.channel.send(hcvem).then(async (msg) => {
            await msg.react("👤")
            await msg.react("❔")
            await msg.react("🪓")
            await msg.react("☎️")
            await msg.react("👥")
            await msg.react("✅")
            await msg.react("❌")
            await msg.react("⁉️")
            await msg.react("🚫")

            const collector = new Discord.ReactionCollector(msg, (r, user) => user.id == message.author.id && 
                (r.emoji.name == '👤' || r.emoji.name == '❔' || r.emoji.name == '🪓' || r.emoji.name == '☎️' || 
                r.emoji.name == '👥' || r.emoji.name == '✅' || r.emoji.name == '❌' || r.emoji.name == '⁉️' || 
                r.emoji.name == '🚫'), { dispose: true, idle: (timer + 19 /*19 secondi della sigla */) * 1000/*, time: timer * 1000*/ })

            collector.on('collect', r => {
                let musicURL = null
                switch (r.emoji.name) {
                    case '👤':
                        musicURL = "https://www.youtube.com/watch?v=5jOOeF9z2rY"
                        break
                    case '❔':
                        musicURL = "https://www.youtube.com/watch?v=Y7ofhcHGM-c"
                        break
                    case '🪓':
                        musicURL = "https://www.youtube.com/watch?v=gY4vn2czC7w"
                        break
                    case '☎️':
                        musicURL = "https://www.youtube.com/watch?v=2KlfuaD_WPA"
                        break
                    case '👥':
                        musicURL = "https://www.youtube.com/watch?v=VSOtgoWWaDo"
                        break
                    case '✅':
                        musicURL = "https://www.youtube.com/watch?v=wWwbT7qCRxQ"
                        break
                    case '❌':
                        musicURL = "https://www.youtube.com/watch?v=wtqMgBUt53w"
                        break
                    case '⁉️':
                        musicURL = "https://www.youtube.com/watch?v=ZyzFzQypEb0"
                        break
                    case '🚫':
                        collector.stop("finish")
                        break
                    default:
                        break
                }

                if (musicURL != null && isMusicOn) 
                    message.reply('***Un suono è già stato avviato, attendi che finisca per avviarne un altro !***')

                if (musicURL != null && !isMusicOn) {
                    collector.resetTimer({ idle: timer * 1000 })
                    isMusicOn = true
                    dispatcher = connection.play(ytdl(musicURL))
                    dispatcher.on("finish", () => {
                        isMusicOn = false
                    })
                    musicURL = null
                }
            })
            
            collector.on('remove', r => {
                if (isMusicOn) {
                    dispatcher.end()
                    isMusicOn = false
                }
            });

            collector.on('end', (c, reason) => {
                isPlaying = false
                voiceChannel.leave()
                msg.channel.bulkDelete(1)
                if (reason != "finish")
                    message.reply(`***non hai eseguito alcuna azione dopo ${timer} secondi, fine del gioco !***`)
            })
        })
    },
}
