const config = require("./../../config.json");
const steamCountries = require('./../../steam_countries.min.json');
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");
const SteamID = require('steamid');

class SteamGame extends Command {
    constructor() {
        super('steamgame', {
           aliases: ['steamgame', 'steamg', 'sg'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'game',
             type: 'number',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[appid]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[appid]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[appid]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni sul gioco* **[appid]** *su Steam*',
             usage: config.prefix + 'steamgame [appid]',
             examples: [config.prefix + 'steamg 304050', config.prefix + 'sg 310950']
           }
        });
    }

    exec(message, args) {
      let bot = this.client, func = this, steamGameData;
      let urls = ["https://store.steampowered.com/api/appdetails?appids=" + args.game,
                  "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=" + args.game,
                  "http://steamspy.com/api.php?request=appdetails&appid=" + args.game];
      func.requestURL(urls, function(response) {
        if (JSON.parse(response[urls[0]].body)[args.game].data === undefined || JSON.parse(response[urls[1]].body).response.result === 42) {
          let iderr = bot.util.embed().setColor(0xC80000)
            .setDescription(`\`${args.game}\` ***non è un'APP ID valido.\nControlla l'ortografia e riprova.***`);
          message.channel.send({embed: iderr});
          return;
        }
        steamGameData = {
          name : JSON.parse(response[urls[0]].body)[args.game].data.name,
          type : JSON.parse(response[urls[0]].body)[args.game].data.type,
          age : JSON.parse(response[urls[0]].body)[args.game].data.required_age,
          borf : JSON.parse(response[urls[0]].body)[args.game].data.is_free,
          bg : JSON.parse(response[urls[0]].body)[args.game].data.header_image,
          price : JSON.parse(response[urls[0]].body)[args.game].data.price_overview,
          achi : JSON.parse(response[urls[0]].body)[args.game].data.achievements.total,
          rel : JSON.parse(response[urls[0]].body)[args.game].data.release_date.date,
          plats : JSON.parse(response[urls[0]].body)[args.game].data.platforms,
          dev : JSON.parse(response[urls[0]].body)[args.game].data.developers,
          pub : JSON.parse(response[urls[0]].body)[args.game].data.publishers,
          pls : JSON.parse(response[urls[1]].body).response.player_count,
          mtg : JSON.parse(response[urls[2]].body).average_forever
        };
        func.sendEmbedGameInfo(message, steamGameData);
      });
    }

    /**
    * Handle multiple requests at once
    * @param urls [array]
    * @param callback [function]
    * @requires request module for node ( https://github.com/mikeal/request )
    */

    async requestURL(urls, callback) {
      'use strict';
      let results = {}, t = urls.length, c = 0,
        handler = function (error, response, body) {
          let url = response.request.uri.href;
          results[url] = { error: error, response: response, body: body };
          if (++c === urls.length) { callback(results); }
        };
      while (t--) { request(urls[t], handler); }
    }

    async sendEmbedGameInfo (message, steamGameData) {
      let steamGameEmbed = new Discord.RichEmbed();
      steamGameEmbed.setAuthor("Informazioni su " + steamGameData.name, config.botimg);
      steamGameEmbed.setThumbnail(steamGameData.bg);
      let type = "Non disponibile", colortype = 0;
      if (steamGameData.type === "game") { type = "Gioco"; colortype = 0x95E318; }
      else if (steamGameData.type === "dlc") { type = "DLC"; colortype = 0xA555B1; }
      else if (steamGameData.type === "mod") { type = "Mod"; colortype = 0xE1B21E; }
      steamGameEmbed.setColor(colortype);
      steamGameEmbed.addField("Tipo", type, true);
      let pegi = steamGameData.age;
      if (steamGameData.age === 0 || steamGameData.age === '0') pegi = "Non disponibile";
      steamGameEmbed.addField("PEGI", pegi, true);
      let forb = "Non disponibile";
      if (steamGameData.borf === false) forb = "€ " + (steamGameData.price.final / 100) + " (" + (steamGameData.price.initial / 100) + ") [" + steamGameData.price.discount_percent + " %]";
      else if (steamGameData.borf === true) forb = "Gratis";
      steamGameEmbed.addField("Prezzo", forb, true);
      let achiev = steamGameData.achi, mtg = "Non disponibile";
      if (achiev === 0) achiev = "Non disponibili";
      if (steamGameData.mtg > 0) mtg = steamGameData.mtg / 60 + " ore";
      steamGameEmbed.addField("Achievements", achiev, true);
      steamGameEmbed.addField("Giocatori attuali", steamGameData.pls, true);
      steamGameEmbed.addField("Media tempo di gioco", mtg, true);
      let devs = "", pubs = "";
      steamGameData.dev.forEach(function(element) {
        devs = devs + ",\n" + element;
      });
      let devs1 = devs.substr(2);
      steamGameEmbed.addField("Sviluppatore/i", devs1, true);
      steamGameData.pub.forEach(function(element) {
        pubs = pubs + ",\n" + element;
      });
      let pubs1 = pubs.substr(2);
      steamGameEmbed.addField("Editore/i", pubs1, true);
      let platforms = "Non disponibile"
      if (steamGameData.plats.windows === true && steamGameData.plats.mac === true && steamGameData.plats.linux === true) platforms = "Windows, Mac e Linux";
      else if (steamGameData.plats.windows === true && steamGameData.plats.mac === true) platforms = "Windows e Mac";
      else if (steamGameData.plats.windows === true && steamGameData.plats.linux === true) platforms = "Windows e Linux";
      else if (steamGameData.plats.mac === true && steamGameData.plats.linux === true) platforms = "Mac e Linux";
      else if (steamGameData.plats.windows === true) platforms = "Windows";
      else if (steamGameData.plats.mac === true) platforms = "Mac";
      else if (steamGameData.plats.linux === true) platforms = "Linux";
      steamGameEmbed.addField("Piattaforme", platforms, true);
      steamGameEmbed.addField("Data di uscita", steamGameData.rel, true);
      message.channel.send({embed: steamGameEmbed});
    }
}

module.exports = SteamGame;
