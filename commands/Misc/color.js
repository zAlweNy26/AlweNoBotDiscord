const config = require("./../../config.json");
const mine = require('./../../functions.js');
const { Command } = require('discord-akairo');
const Discord = require("discord.js");
const convert = require('color-convert');
const Jimp = require('jimp');

class Color extends Command {
  constructor() {
    super('color', {
      aliases: ['color'],
      ownerOnly: false,
      channelRestriction: 'guild',
      category: 'Info',
      typing: false,
      userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
      args: [
        {
          id: 'format',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno di un argomento (***\`[formato]\`***) per funzionare.***',
            retry: '***devi inserire un argomento (***\`[formato]\`***) valido !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento (***\`[formato]\`***) valido.***'
          }
        },
        {
          id: 'value',
          type: 'lowercase',
          prompt: {
            start: '***questo comando ha bisogno di un argomento (***\`[valore]\`***) per funzionare.***',
            retry: '***devi inserire un argomento (***\`[valore]\`***) valido !***',
            ended: '***tentativi massimi raggiunti per utilizzare questo comando. Comando cancellato.***',
            timeout: '***tempo scaduto per inserire un argomento (***\`[valore]\`***) valido.***'
          }
        }
      ],
      description: {
        content: '*Mostra il colore inserito tramite* **[valore]**',
        usage: config.prefix + 'color [formato] [valore]',
        examples: [
          config.prefix + 'color hex 0047AB', 
          config.prefix + 'color rgb 0,255,215', 
          config.prefix + 'color hsl 215,100,34',
          config.prefix + 'color hsv 171,100,50'
        ]
      }
    });
  }

  exec(message, args) {
    let bot = this.client, formats = ['HEX', 'RGB', 'HSL', 'HSV', 'XYZ', 'HCG'], abbr = "";
    if (formats.includes(args.format.toUpperCase()) === false) {
      for (let i = 0; i < formats.length; i++) {
        if (i === 0) abbr = formats[i] + abbr;
        else abbr = formats[i] + ", " + abbr;
      }
      let err = bot.util.embed().setColor(0xC80000)
        .setDescription(`***I formati disponibili sono :*** \`` + abbr + `\``);
      message.channel.send({ embed: err });
    } else {
      let chex = "", crgb = "", chsl = "", chsv = "", cxyz = "", chcg = "";
      if (args.format.toLowerCase() == "rgb") {
        let splitted = args.value.split(",");
        crgb = args.value;
        chex = convert.rgb.hex(splitted);
        chsl = convert.rgb.hsl(splitted);
        chsv = convert.rgb.hsv(splitted);
      } else if (args.format.toLowerCase() == "hex") {
        crgb = convert.hex.rgb(args.value.replace("#", ""));
        chex = args.value.replace("#", "");
        chsl = convert.hex.hsl(args.value.replace("#", ""));
        chsv = convert.hex.hsv(args.value.replace("#", ""));
      } else if (args.format.toLowerCase() == "hsl") {
        let splitted = args.value.split(",");
        crgb = convert.hsl.rgb(splitted);
        chex = convert.hsl.hex(splitted);
        chsl = args.value;
        chsv = convert.hsl.hsv(splitted); 
      } else if (args.format.toLowerCase() == "hsv") {
        let splitted = args.value.split(",");
        crgb = convert.hsv.rgb(splitted);
        chex = convert.hsv.hex(splitted);
        chsl = convert.hsv.hsl(splitted);
        chsv = args.value; 
      } else if (args.format.toLowerCase() == "hcg") {
        let splitted = args.value.split(",");
        crgb = convert.hcg.rgb(splitted);
        chex = convert.rgb.hex(crgb);
        chsl = convert.rgb.hsl(crgb);
        chsv = convert.rgb.hsv(crgb);
        chcg = args.value;
      } else if (args.format.toLowerCase() == "xyz") {
        let splitted = args.value.split(",");
        crgb = convert.xyz.rgb(splitted);
        chex = convert.rgb.hex(crgb);
        chsl = convert.rgb.hsl(crgb);
        chsv = convert.rgb.hsv(crgb);
        cxyz = args.value;
      }
      let splitrgb = crgb.toString().split(",");
      if (args.format.toLowerCase() != "hcg") chcg = convert.rgb.hcg(splitrgb);
      if (args.format.toLowerCase() != "xyz") cxyz = convert.rgb.xyz(splitrgb);
      /*let imagecolor = new Jimp(128, 128, "#" + chex.toUpperCase().toString(), (err, image) => {
        image.getBase64(Jimp.AUTO, function (e, img64) {
          if (e) throw e
          let regExMatches = img64.match('data:(image/.*);base64,(.*)');
          let dataBuffer = new Buffer(regExMatches[2], 'base64');
          require("fs").writeFile("color.png", img64.replace(/^data:image\/png;base64,/, ""), 'base64', function (err) { });
          let conv = bot.util.embed().setColor(0x00AE86).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
            .setAuthor(`Formati convertiti dal colore inserito`, bot.user.avatarURL)
            .setThumbnail("attachment://./../../image.png")
            .addField("Format HEX", "\`#" + chex.toUpperCase() + "\`", true)
            .addField("Format RGB", "\`rgb(" + crgb + ")\`", true)
            .addField("Format HSL", "\`hsl(" + chsl + ")\`", true)
            .addField("Format HSV", "\`hsv(" + chsv + ")\`", true)
            .addField("Format HCG", "\`hcg(" + chcg + ")\`", true)
            .addField("Format XYZ", "\`xyz(" + cxyz + ")\`", true);
          message.channel.send({ embed: conv });
        });
      });*/
      let conv = bot.util.embed().setColor(parseInt("0x" + chex.toUpperCase())).setTimestamp().setFooter("© AlweNoBot by zAlweNy26#1059")
        .setAuthor(`Formati convertiti dal colore inserito`, bot.user.avatarURL)
        .addField("Format HEX", "\`#" + chex.toUpperCase() + "\`", true)
        .addField("Format RGB", "\`rgb(" + crgb + ")\`", true)
        .addField("Format HSL", "\`hsl(" + chsl + ")\`", true)
        .addField("Format HSV", "\`hsv(" + chsv + ")\`", true)
        .addField("Format HCG", "\`hcg(" + chcg + ")\`", true)
        .addField("Format XYZ", "\`xyz(" + cxyz + ")\`", true);
      message.channel.send({ embed: conv });
    }
  }
}

module.exports = Color;