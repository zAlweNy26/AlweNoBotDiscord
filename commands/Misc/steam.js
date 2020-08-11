const config = require("./../../config.json");
const steamCountries = require('./../../steam_countries.min.json');
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const request = require("request");
const SteamID = require('steamid');
const SteamInfo = require('machinepack-steam');
const _ = require("underscore");

class SteamUser extends Command {
    constructor() {
        super('steam', {
           aliases: ['steam'],
           ownerOnly: false,
           channelRestriction: 'guild',
           category: 'Misc',
           typing: false,
           userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
           args: [{
    				 id: 'nick',
             type: 'string',
    				 prompt: {
               start: '***questo comando ha bisogno di un argomento (***\`[nickname|steamid]\`***) per funzionare.***',
               retry: '***devi inserire un argomento (***\`[nickname|steamid]\`***) valido !***',
               ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
               timeout: '***tempo scaduto per inserire un argomento (***\`[nickname|steamid]\`***) valido.***'
    				 }
    			 }],
           description: {
             content: '*Mostra informazioni sull\'account Steam di* **[nickname|steamid]**',
             usage: config.prefix + 'steam [nickname|steamid]',
             examples: [config.prefix + 'steam zAlweNy26', config.prefix + 'steam 76561198154675159']
           }
        });
    }

    exec(message, args) {
      let bot = this.client, func = this, steamID64, steamUserData, matches, words = 0;
      for (let i = 0; i < args.nick.length; i++) if (args.nick.charAt(i) === '_') words++;
      if (words === 0) {
        if(/(?:https?:\/\/)?steamcommunity\.com\/(?:profiles|id)\/[a-zA-Z0-9]+/.test(args.nick) === true) {
          let regexp = /(?:https?:\/\/)?(?:steamcommunity\.com\/)(?:profiles|id)\/([a-zA-Z0-9]+)/g;
          let match = regexp.exec(args.nick);
          args.nick = match[1];
        }
      }
      request({
        url: "http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=" + process.env.steamAPIKey + "&vanityurl=" + args.nick,
        json: true
      }, function(error, response, body) {
        if (response.statusCode == 403) {
          console.error("ERROR: SteamAPI key might be missing, wrong or forbidden.");
          console.error("Please check your config.json if the steamAPIKey parameter is correct.");
          let steamkeyerr = bot.util.embed().setColor(0xC80000)
    				.setDescription(`***Impossibile elaborare la richiesta. Si prega di controllare la console o chiedere al proprietario del bot per maggiori dettagli.***`);
    			message.channel.send({embed: steamkeyerr});
          return;
        }
        if (args.nick.startsWith('<@') === true) {
          console.error("ERROR: Tried getting SteamID from Discord user name. This is not possible without an userbot.");
          let steamdiscord = bot.util.embed().setColor(0xC80000)
    				.setDescription(`***Non è possibile recuperare l'account Steam dal tuo account Discord a causa di restrizioni di sicurezza.***`);
    			message.channel.send({embed: steamdiscord});
          return;
        }
        if(/^\d+$/.test(args.nick) && args.nick.length == 17) steamID64 = args.nick;
        else if (body.response.success == 1) steamID64 = body.response.steamid;
        else if((matches = args.nick.match(/^STEAM_([0-5]):([0-1]):([0-9]+)$/)) || (matches = args.nick.match(/^\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\]$/))) {
          let SteamID3 = new SteamID(args.nick);
          steamID64 = SteamID3.getSteamID64();
        } else {
          let steamiderr = bot.util.embed().setColor(0xC80000)
            .setDescription(`***Impossibile trovare un account con l'ID Steam*** \`${args.nick}\`***. Controlla e riprova.***`);
          message.channel.send({embed: steamiderr});
          return;
        }
        /*let username = "Non disponibile", realname = "Non disponibile", status = "Non disponibile", games = "Non disponibili",
            gamename = "Non disponibile", loccountrycode = "Non disponibile", locstatecode = "Non disponibile", loccityid = "Non disponibile";
        let friends = 0, gameid = 0, gamepl = 0, gameh = 0, level = 0, lastlogoff = 0, avatar, timecreated;
        SteamInfo.getSteamLevel({
          steamid: steamID64, key: process.env.steamAPIKey
        }).exec({
          error: function (err) { console.log(err); },
          success: function (result) { level = result.response.player_level; }
        });
        console.log(level);
        SteamInfo.getFriendList({
          steamid: steamID64, key: process.env.steamAPIKey, relationship: 'friend'
        }).exec({
          error: function (err) { console.log(err); },
          success: function (result) { friends = Object.keys(result.friendslist.friends).length; }
        });
        SteamInfo.getPlayerSummaries({
          steamids: [ steamID64 ], key: process.env.steamAPIKey
        }).exec({
          error: function (err) { console.log(err); },
          success: function (result) {
            avatar = result.players[0].avatarfull;
            username = result.players[0].personaname;
            realname = result.players[0].realname;
            status = result.players[0].personastate;
            gameid = result.players[0].gameid;
            timecreated = result.players[0].timecreated;
            lastlogoff = result.players[0].lastlogoff;
            loccountrycode = result.players[0].loccountrycode;
            locstatecode = result.players[0].locstatecode;
            loccityid = result.players[0].loccityid;
          }
        });
        SteamInfo.getOwnedGames({
          steamid: steamID64, key: process.env.steamAPIKey, include_appinfo: 1, include_played_free_games: 1
        }).exec({
          error: function (err) { console.log(err); },
          success: function (result) {
            games = result.game_count;
            gamepl = result.games.filter(function(item) {
              return item.appid === parseInt(gameid, 10);
            });
            gamename = gamepl[0].name;
            gameh = parseFloat(gamepl[0].playtime_forever / 60).toFixed(2);
          }
        });
        let steamUserEmbed = bot.util.embed();
        steamUserEmbed.setAuthor("Informazioni su " + username, config.botimg);
        steamUserEmbed.setThumbnail(avatar);
        message.channel.send({embed: steamUserEmbed});*/
        let urls = ["http://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=" + process.env.steamAPIKey + "&steamid=" + steamID64,
                    "http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=" + process.env.steamAPIKey + "&steamids=" + steamID64,
                    "http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=" + process.env.steamAPIKey + "&steamid=" + steamID64,
                    "http://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key=" + process.env.steamAPIKey + "&steamid=" + steamID64];
        func.requestURL(urls, function(response) {
          steamUserData = {
            avatar: (JSON.parse(response[urls[1]].body).response.players[0].avatarfull),
            username: (JSON.parse(response[urls[1]].body).response.players[0].personaname),
            realname: (JSON.parse(response[urls[1]].body).response.players[0].realname),
            status : (JSON.parse(response[urls[1]].body).response.players[0].personastate),
            friends : (JSON.parse(response[urls[3]].body)),
            gameinfo : (JSON.parse(response[urls[1]].body).response.players[0].gameextrainfo),
            gameid : (JSON.parse(response[urls[1]].body).response.players[0].gameid),
            games : (JSON.parse(response[urls[2]].body).response.games),
            level : (JSON.parse(response[urls[0]].body).response.player_level),
            timecreated: (JSON.parse(response[urls[1]].body).response.players[0].timecreated),
            lastlogoff: (JSON.parse(response[urls[1]].body).response.players[0].lastlogoff),
            loccountrycode: (JSON.parse(response[urls[1]].body).response.players[0].loccountrycode),
            locstatecode: (JSON.parse(response[urls[1]].body).response.players[0].locstatecode),
            loccityid: (JSON.parse(response[urls[1]].body).response.players[0].loccityid),
          };
          func.sendUserEmbedMessage(message, steamUserData);
        });
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

    async sendUserEmbedMessage (message, steamUserData) {
      let steamUserEmbed = this.client.util.embed();
      steamUserEmbed.setAuthor("Informazioni su " + steamUserData.username, config.botimg);
      steamUserEmbed.setThumbnail(steamUserData.avatar);
      steamUserEmbed.setColor(mine.colorbystatus(steamUserData.status));
      if (steamUserData.realname === undefined) steamUserEmbed.addField("Nome", "Non disponibile", true);
      else steamUserEmbed.addField("Nome", steamUserData.realname, true);
      let friends = "Non disponibili", games = "Non disponibili", level = "Non disponibile";
      if (steamUserData.level !== undefined) level = steamUserData.level;
      steamUserEmbed.addField("Livello", level, true);
      if (!_.isEqual(steamUserData.friends, JSON.parse("{}"))) friends = Object.keys(steamUserData.friends.friendslist.friends).length;
      steamUserEmbed.addField("Amici", friends, true);
      if (steamUserData.games !== undefined) games = Object.keys(steamUserData.games).length;
      steamUserEmbed.addField("Giochi giocati", games, true);
      if (steamUserData.gameinfo !== undefined) {
        steamUserEmbed.addField("In gioco", steamUserData.gameinfo, true);
        let hgame = steamUserData.games.filter(function(item) {
          return item.appid === parseInt(steamUserData.gameid, 10);
        });
        steamUserEmbed.addField("Ore nel gioco", parseFloat(hgame[0].playtime_forever / 60).toFixed(1) + " ore", true);
        steamUserEmbed.setColor(0x95E318);
      }
      let loccountrycode = steamUserData.loccountrycode, locstatecode = steamUserData.locstatecode, loccityid = steamUserData.loccityid;
      if (steamUserData.loccityid !== undefined && steamUserData.locstatecode !== undefined && steamUserData.loccountrycode !== undefined) {
        let loccityname = steamCountries[loccountrycode].states[locstatecode].cities[loccityid].name;
        let locregionname = steamCountries[loccountrycode].states[locstatecode].name;
        steamUserEmbed.addField("Provenienza", loccityname + ", " + locregionname + ", " + mine.getCountryName(steamUserData.loccountrycode), true);
      } else if (steamUserData.loccountrycode !== undefined && steamUserData.locstatecode !== undefined) {
        let locregionname = steamCountries[loccountrycode].states[locstatecode].name;
        steamUserEmbed.addField("Provenienza", locregionname + ", " + mine.getCountryName(steamUserData.loccountrycode), true);
      } else if (steamUserData.loccountrycode !== undefined) {
        steamUserEmbed.addField("Provenienza", mine.getCountryName(steamUserData.loccountrycode), true);
      } else steamUserEmbed.addField("Provenienza", "Non disponibile", true);
      let timecreated = "Non disponibile";
      if (steamUserData.timecreated !== undefined) timecreated = mine.UnixConv(steamUserData.timecreated);
      steamUserEmbed.addField("Account creato il", timecreated, true);
      steamUserEmbed.setFooter("Ultimo accesso : " + mine.UnixConv(steamUserData.lastlogoff));
      message.channel.send({embed: steamUserEmbed});
    }
}

module.exports = SteamUser;
