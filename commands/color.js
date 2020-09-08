const Discord = require("discord.js")
const convert = require('color-convert')
const Jimp = require('jimp')

module.exports = {
  	name: 'color',
  	description: '*Mostra ii diversi formati del colore inserito.*',
  	aliases: ['cl'],
  	category: 'Misc',
  	usage: '[formato] [valore]',
  	userPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
    guildOnly: true,
    ownerOnly: false,
    examples: ['color hex 0047AB', 'color rgb 0,255,215', 'color hsv 171,100,50', 'color hsl 215,100,34'],
    args: 2,
    execute(message, args) {
        let formats = ['HEX', 'RGB', 'HSL', 'HSV', 'XYZ', 'HCG'], abbr = ""
        if (formats.includes(args[0].toUpperCase()) === false) {
            for (let i = 0; i < formats.length; i++) {
                if (i === 0) abbr = formats[i] + abbr
                else abbr = formats[i] + ", " + abbr
            }
            let err = new Discord.MessageEmbed().setColor(0xC80000)
                .setDescription(`***I formati disponibili sono :*** \`` + abbr + `\``)
            message.channel.send(err)
        } else {
            let chex = "", crgb = "", chsl = "", chsv = "", cxyz = "", chcg = ""
            if (args[0].toLowerCase() == "rgb") {
                let splitted = args[1].split(",")
                crgb = args[1]
                chex = convert.rgb.hex(splitted)
                chsl = convert.rgb.hsl(splitted)
                chsv = convert.rgb.hsv(splitted)
            } else if (args[0].toLowerCase() == "hex") {
                crgb = convert.hex.rgb(args[1].replace("#", ""))
                chex = args[1].replace("#", "")
                chsl = convert.hex.hsl(args[1].replace("#", ""))
                chsv = convert.hex.hsv(args[1].replace("#", ""))
            } else if (args[0].toLowerCase() == "hsl") {
                let splitted = args[1].split(",")
                crgb = convert.hsl.rgb(splitted)
                chex = convert.hsl.hex(splitted)
                chsl = args[1]
                chsv = convert.hsl.hsv(splitted) 
            } else if (args[0].toLowerCase() == "hsv") {
                let splitted = args[1].split(",")
                crgb = convert.hsv.rgb(splitted)
                chex = convert.hsv.hex(splitted)
                chsl = convert.hsv.hsl(splitted)
                chsv = args[1] 
            } else if (args[0].toLowerCase() == "hcg") {
                let splitted = args[1].split(",")
                crgb = convert.hcg.rgb(splitted)
                chex = convert.rgb.hex(crgb)
                chsl = convert.rgb.hsl(crgb)
                chsv = convert.rgb.hsv(crgb)
                chcg = args[1]
            } else if (args[0].toLowerCase() == "xyz") {
                let splitted = args[1].split(",")
                crgb = convert.xyz.rgb(splitted)
                chex = convert.rgb.hex(crgb)
                chsl = convert.rgb.hsl(crgb)
                chsv = convert.rgb.hsv(crgb)
                cxyz = args[1]
            }
            let splitrgb = crgb.toString().split(",")
            if (args[0].toLowerCase() != "hcg") chcg = convert.rgb.hcg(splitrgb)
            if (args[0].toLowerCase() != "xyz") cxyz = convert.rgb.xyz(splitrgb)
            new Jimp(128, 128, "#" + chex.toUpperCase().toString(), (err, image) => {
                image.getBase64(Jimp.AUTO, function (e, img64) {
                    if (e) throw e
                    require("fs").writeFile("color.png", img64.replace(/^data:image\/png;base64,/, ""), 'base64', err => {});
                    let conv = new Discord.MessageEmbed().setColor('#' + chex.toUpperCase())
                        .setAuthor(`Formati convertiti dal colore inserito`)
                        .attachFiles(['./color.png'])
                        .setThumbnail("attachment://color.png")
                        .addField("Format HEX", "\`#" + chex.toUpperCase() + "\`", true)
                        .addField("Format RGB", "\`rgb(" + crgb + ")\`", true)
                        .addField("Format HSL", "\`hsl(" + chsl + ")\`", true)
                        .addField("Format HSV", "\`hsv(" + chsv + ")\`", true)
                        .addField("Format HCG", "\`hcg(" + chcg + ")\`", true)
                        .addField("Format XYZ", "\`xyz(" + cxyz + ")\`", true)
                    message.channel.send(conv)
                })
            })
        }
    },
}