const steamCountries = require('./../steam_countries.min.json')
const request = require("request")
const SteamID = require('steamid')
const Discord = require('discord.js')

module.exports = {
  	name: 'steamgame',
  	description: '*Mostra informazioni sul gioco di Steam inserito*',
  	aliases: ['steamgame', 'steamg', 'sgame', 'sg'],
  	category: 'Misc',
  	usage: '[appid]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
	  guildOnly: true,
	  ownerOnly: false,
	  examples: ['steamg 304050', 'sg Street Fighter V'],
	  args: -1,
	  execute(message, args) {
        let func = this, steamGameData
        if (isNaN(args.join(" "))) {
            request({
                url: "http://api.steampowered.com/ISteamApps/GetAppList/v2/",
                json: true
            }, function (error, response, body) {
                let game = body.applist.apps.filter(function (item) {
                    return item.name.toUpperCase() === args.join(" ").toUpperCase()
                })
                if (game[0] === undefined || body === undefined) {
                    let iderr = new Discord.MessageEmbed().setColor(0xC80000)
                        .setDescription(`*Il gioco* \`${args.join(" ")}\` *non è un'APP ID valido.\nControlla l'ortografia e riprova.*`)
                    return message.channel.send(iderr)
                }
                let urls = ["https://store.steampowered.com/api/appdetails?appids=" + game[0].appid,
                            "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?key=" + process.env.steamAPIKey + "&appid=" + game[0].appid,
                            "https://steamspy.com/api.php?request=appdetails&appid=" + game[0].appid]
                func.requestURL(urls, function (response) {
                    if (JSON.parse(response[urls[0]].body)[game[0].appid].data === undefined || JSON.parse(response[urls[1]].body).response.result === 42) {
                        let iderr = new Discord.MessageEmbed().setColor(0xC80000)
                            .setDescription(`\`${args.join(" ")}\` ***non è un'APP ID valido.\nControlla l'ortografia e riprova.***`)
                        return message.channel.send(iderr)
                    }
                    steamGameData = {
                        name: JSON.parse(response[urls[0]].body)[game[0].appid].data.name,
                        type: JSON.parse(response[urls[0]].body)[game[0].appid].data.type,
                        age: JSON.parse(response[urls[0]].body)[game[0].appid].data.required_age,
                        dlcs: JSON.parse(response[urls[0]].body)[game[0].appid].data.dlc,
                        borf: JSON.parse(response[urls[0]].body)[game[0].appid].data.is_free,
                        bg: JSON.parse(response[urls[0]].body)[game[0].appid].data.header_image,
                        pi: JSON.parse(response[urls[0]].body)[game[0].appid].data.price_overview.initial,
                        pf: JSON.parse(response[urls[0]].body)[game[0].appid].data.price_overview.final,
                        dp: JSON.parse(response[urls[0]].body)[game[0].appid].data.price_overview.discount_percent,
                        achi: JSON.parse(response[urls[0]].body)[game[0].appid].data.achievements.total,
                        rel: JSON.parse(response[urls[0]].body)[game[0].appid].data.release_date.date,
                        plats: JSON.parse(response[urls[0]].body)[game[0].appid].data.platforms,
                        dev: JSON.parse(response[urls[0]].body)[game[0].appid].data.developers,
                        pub: JSON.parse(response[urls[0]].body)[game[0].appid].data.publishers,
                        pls: JSON.parse(response[urls[1]].body).response.player_count,
                        mtg: JSON.parse(response[urls[2]].body).average_forever
                    }
                    func.sendEmbedGameInfo(message, steamGameData)
                })
            })
        } else {
            let urls = ["https://store.steampowered.com/api/appdetails?appids=" + args[0],
                        "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?key=" + process.env.steamAPIKey + "&appid=" + args[0],
                        "https://steamspy.com/api.php?request=appdetails&appid=" + args[0]]
            func.requestURL(urls, function (response) {
                if (JSON.parse(response[urls[0]].body)[args[0]].data === undefined || JSON.parse(response[urls[1]].body).response.result === 42) {
                    let iderr = new Discord.MessageEmbed().setColor(0xC80000)
                        .setDescription(`\`${args.join(" ")}\` ***non è un'APP ID valido.\nControlla l'ortografia e riprova.***`)
                    return message.channel.send(iderr)
                }
                steamGameData = {
                    name: JSON.parse(response[urls[0]].body)[args[0]].data.name,
                    type: JSON.parse(response[urls[0]].body)[args[0]].data.type,
                    age: JSON.parse(response[urls[0]].body)[args[0]].data.required_age,
                    dlcs: JSON.parse(response[urls[0]].body)[args[0]].data.dlc,
                    borf: JSON.parse(response[urls[0]].body)[args[0]].data.is_free,
                    bg: JSON.parse(response[urls[0]].body)[args[0]].data.header_image,
                    pi: JSON.parse(response[urls[0]].body)[args[0]].data.price_overview.initial,
                    pf: JSON.parse(response[urls[0]].body)[args[0]].data.price_overview.final,
                    dp: JSON.parse(response[urls[0]].body)[args[0]].data.price_overview.discount_percent,
                    achi: JSON.parse(response[urls[0]].body)[args[0]].data.achievements.total,
                    rel: JSON.parse(response[urls[0]].body)[args[0]].data.release_date.date,
                    plats: JSON.parse(response[urls[0]].body)[args[0]].data.platforms,
                    dev: JSON.parse(response[urls[0]].body)[args[0]].data.developers,
                    pub: JSON.parse(response[urls[0]].body)[args[0]].data.publishers,
                    pls: JSON.parse(response[urls[1]].body).response.player_count,
                    mtg: JSON.parse(response[urls[2]].body).average_forever
                }
                func.sendEmbedGameInfo(message, steamGameData)
            })
        }
    },
    async requestURL(urls, callback) {
      'use strict'
      let results = {}, t = urls.length, c = 0,
        handler = function (error, response, body) {
          let url = response.request.uri.href
          results[url] = { error: error, response: response, body: body }
          if (++c === urls.length) { callback(results) }
        }
      while (t--) { request(urls[t], handler) }
    },
    async sendEmbedGameInfo (message, steamGameData) {
        let steamGameEmbed = new Discord.MessageEmbed()
            .setAuthor("Informazioni su " + steamGameData.name)
            .setThumbnail(steamGameData.bg)
        let type = "Non disponibile", colortype = 0
        if (steamGameData.type === "game") { type = "Gioco"; colortype = 0x95E318 }
        else if (steamGameData.type === "dlc") { type = "DLC"; colortype = 0xA555B1 }
        else if (steamGameData.type === "mod") { type = "Mod"; colortype = 0xE1B21E }
        steamGameEmbed.setColor(colortype)
        steamGameEmbed.addField("Tipo", type, true)
        let pegi = steamGameData.age
        if (steamGameData.age === 0 || steamGameData.age === '0') pegi = "Non disponibile"
        steamGameEmbed.addField("PEGI", pegi, true)
        let forb = "Non disponibile"
        if (steamGameData.borf === false) forb = "€ " + (steamGameData.pf / 100) + " (" + (steamGameData.pi / 100) + ") [" + steamGameData.dp + " %]"
        else if (steamGameData.borf === true) forb = "Gratis"
        steamGameEmbed.addField("Prezzo", forb, true)
        let achiev = steamGameData.achi, mtg = "Non disponibile"
        if (achiev === 0) achiev = "Non disponibili"
        if (steamGameData.mtg > 0) mtg = (steamGameData.mtg / 60).toFixed(2) + " ore"
        steamGameEmbed.addField("Achievements", achiev, true)
        steamGameEmbed.addField("Giocatori attuali", steamGameData.pls, true)
        steamGameEmbed.addField("Media tempo di gioco", mtg, true)
        let devs = "", pubs = ""
        steamGameData.dev.forEach(function(element) {
            devs = devs + ",\n" + element
        })
        let devs1 = devs.substr(2)
        steamGameEmbed.addField("Sviluppatore/i", devs1, true)
        steamGameData.pub.forEach(function(element) {
            pubs = pubs + ",\n" + element
        })
        let pubs1 = pubs.substr(2)
        steamGameEmbed.addField("Editore/i", pubs1, true)
        let platforms = "Non disponibile"
        if (steamGameData.plats.windows === true && steamGameData.plats.mac === true && steamGameData.plats.linux === true) platforms = "Windows, Mac e Linux"
        else if (steamGameData.plats.windows === true && steamGameData.plats.mac === true) platforms = "Windows e Mac"
        else if (steamGameData.plats.windows === true && steamGameData.plats.linux === true) platforms = "Windows e Linux"
        else if (steamGameData.plats.mac === true && steamGameData.plats.linux === true) platforms = "Mac e Linux"
        else if (steamGameData.plats.windows === true) platforms = "Windows"
        else if (steamGameData.plats.mac === true) platforms = "Mac"
        else if (steamGameData.plats.linux === true) platforms = "Linux"
        steamGameEmbed.addField("Piattaforma/e", platforms, true)
        steamGameEmbed.addField("Data di uscita", steamGameData.rel, true)
        message.channel.send(steamGameEmbed)
    }
}
