const Discord = require("discord.js");

let isoCountries = {
    'AF' : 'Afghanistan',
    'AX' : 'Isole Aland',
    'AL' : 'Albania',
    'DZ' : 'Algeria',
    'AS' : 'Samoa Americane',
    'AD' : 'Andorra',
    'AO' : 'Angola',
    'AI' : 'Anguilla',
    'AQ' : 'Antartide',
    'AG' : 'Antigua e Barbuda',
    'AR' : 'Argentina',
    'AM' : 'Armenia',
    'AW' : 'Aruba',
    'AU' : 'Australia',
    'AT' : 'Austria',
    'AZ' : 'Azerbaijan',
    'BS' : 'Bahamas',
    'BH' : 'Bahrain',
    'BD' : 'Bangladesh',
    'BB' : 'Barbados',
    'BY' : 'Bielorussia',
    'BE' : 'Belgio',
    'BZ' : 'Belize',
    'BJ' : 'Benin',
    'BM' : 'Bermuda',
    'BT' : 'Bhutan',
    'BO' : 'Bolivia',
    'BA' : 'Bosnia ed Erzegovina',
    'BW' : 'Botswana',
    'BV' : 'Isola Bouvet',
    'BR' : 'Brasile',
    'IO' : 'Territorio britannico dell\'Oceano Indiano',
    'BN' : 'Sultanato del Brunei',
    'BG' : 'Bulgaria',
    'BF' : 'Burkina Faso',
    'BI' : 'Burundi',
    'KH' : 'Cambogia',
    'CM' : 'Cameroon',
    'CA' : 'Canada',
    'CV' : 'Capo Verde',
    'KY' : 'Isole Cayman',
    'CF' : 'Repubblica Centrafricana',
    'TD' : 'Chad',
    'CL' : 'Cile',
    'CN' : 'Cina',
    'CX' : 'Isola di Natale',
    'CC' : 'Isole Cocos',
    'CO' : 'Colombia',
    'KM' : 'Comoros',
    'CG' : 'Congo',
    'CD' : 'Repubblica Democratica del Congo',
    'CK' : 'Isole Cook',
    'CR' : 'Costa Rica',
    'CI' : 'Costa d\'Avorio',
    'HR' : 'Croazia',
    'CU' : 'Cuba',
    'CY' : 'Cipro',
    'CZ' : 'Repubblica Ceca',
    'DK' : 'Danimarca',
    'DJ' : 'Gibuti',
    'DM' : 'Dominica',
    'DO' : 'Repubblica Dominicana',
    'EC' : 'Ecuador',
    'EG' : 'Egitto',
    'SV' : 'El Salvador',
    'GQ' : 'Guinea Equatoriale',
    'ER' : 'Eritrea',
    'EE' : 'Estonia',
    'ET' : 'Etiopia',
    'FK' : 'Isole Falkland',
    'FO' : 'Fær Øer',
    'FJ' : 'Fiji',
    'FI' : 'Finlandia',
    'FR' : 'Francia',
    'GF' : 'Guyana francese',
    'PF' : 'Polinesia Francese',
    'TF' : 'Terre australi e antartiche francesi',
    'GA' : 'Gabon',
    'GM' : 'Gambia',
    'GE' : 'Georgia',
    'DE' : 'Germania',
    'GH' : 'Ghana',
    'GI' : 'Gibilterra',
    'GR' : 'Grecia',
    'GL' : 'Groenlandia',
    'GD' : 'Grenada',
    'GP' : 'Guadalupa',
    'GU' : 'Guam',
    'GT' : 'Guatemala',
    'GG' : 'Baliato di Guernsey',
    'GN' : 'Guinea',
    'GW' : 'Guinea-Bissau',
    'GY' : 'Guyana',
    'HT' : 'Haiti',
    'HM' : 'Isole Heard e McDonald',
    'VA' : 'Città del Vaticano',
    'HN' : 'Honduras',
    'HK' : 'Hong Kong',
    'HU' : 'Ungheria',
    'IS' : 'Islanda',
    'IN' : 'India',
    'ID' : 'Indonesia',
    'IR' : 'Iran',
    'IQ' : 'Iraq',
    'IE' : 'Irlanda',
    'IM' : 'Isola di Man',
    'IL' : 'Israele',
    'IT' : 'Italia',
    'JM' : 'Jamaica',
    'JP' : 'Giappone',
    'JE' : 'Jersey',
    'JO' : 'Jordan',
    'KZ' : 'Kazakhstan',
    'KE' : 'Kenya',
    'KI' : 'Kiribati',
    'KR' : 'Korea',
    'KW' : 'Kuwait',
    'KG' : 'Kyrgyzstan',
    'LA' : 'Repubblica Popolare Democratica del Laos',
    'LV' : 'Lettonia',
    'LB' : 'Libano',
    'LS' : 'Lesotho',
    'LR' : 'Liberia',
    'LY' : 'Libia',
    'LI' : 'Liechtenstein',
    'LT' : 'Lituania',
    'LU' : 'Lussemburgo',
    'MO' : 'Macao',
    'MK' : 'Macedonia',
    'MG' : 'Madagascar',
    'MW' : 'Malawi',
    'MY' : 'Malaysia',
    'MV' : 'Maldive',
    'ML' : 'Mali',
    'MT' : 'Malta',
    'MH' : 'Isole Marshall',
    'MQ' : 'Martinica',
    'MR' : 'Mauritania',
    'MU' : 'Mauritius',
    'YT' : 'Mayotte',
    'MX' : 'Mexico',
    'FM' : 'Micronesia',
    'MD' : 'Moldavia',
    'MC' : 'Monaco',
    'MN' : 'Mongolia',
    'ME' : 'Montenegro',
    'MS' : 'Montserrat',
    'MA' : 'Marocco',
    'MZ' : 'Mozambico',
    'MM' : 'Myanmar',
    'NA' : 'Namibia',
    'NR' : 'Nauru',
    'NP' : 'Nepal',
    'NL' : 'Paesi Bassi',
    'AN' : 'Antille Olandesi',
    'NC' : 'Nuova Caledonia',
    'NZ' : 'Nuova Zelanda',
    'NI' : 'Nicaragua',
    'NE' : 'Niger',
    'NG' : 'Nigeria',
    'NU' : 'Niue',
    'NF' : 'Isola Norfolk',
    'MP' : 'Isole Marianne Settentrionali',
    'NO' : 'Norvegia',
    'OM' : 'Oman',
    'PK' : 'Pakistan',
    'PW' : 'Palau',
    'PS' : 'Territori palestinesi',
    'PA' : 'Panama',
    'PG' : 'Papua Nuova Guinea',
    'PY' : 'Paraguay',
    'PE' : 'Perù',
    'PH' : 'Philippine',
    'PN' : 'Isole Pitcairn',
    'PL' : 'Polonia',
    'PT' : 'Portogallo',
    'PR' : 'Puerto Rico',
    'QA' : 'Qatar',
    'RE' : 'Riunione',
    'RO' : 'Romania',
    'RU' : 'Russia',
    'RW' : 'Rwanda',
    'BL' : 'Saint-Barthélemy',
    'SH' : 'Sant\'Elena',
    'KN' : 'Saint Kitts e Nevis',
    'LC' : 'Santa Lucia',
    'MF' : 'San Martino',
    'PM' : 'Saint-Pierre e Miquelon',
    'VC' : 'Saint Vincent e Grenadine',
    'WS' : 'Samoa',
    'SM' : 'San Marino',
    'ST' : 'São Tomé e Príncipe',
    'SA' : 'Arabia Saudita',
    'SN' : 'Senegal',
    'RS' : 'Serbia',
    'SC' : 'Seychelles',
    'SL' : 'Sierra Leone',
    'SG' : 'Singapore',
    'SK' : 'Slovacchia',
    'SI' : 'Slovenia',
    'SB' : 'Isole Salomone',
    'SO' : 'Somalia',
    'ZA' : 'Sudafrica',
    'GS' : 'Georgia del Sud',
    'ES' : 'Spagna',
    'LK' : 'Sri Lanka',
    'SD' : 'Sudan',
    'SR' : 'Suriname',
    'SJ' : 'Svalbard e Jan Mayen',
    'SZ' : 'Swaziland',
    'SE' : 'Svezia',
    'CH' : 'Svizzera',
    'SY' : 'Siria',
    'TW' : 'Taiwan',
    'TJ' : 'Tajikistan',
    'TZ' : 'Tanzania',
    'TH' : 'Thailandia',
    'TL' : 'Timor Est',
    'TG' : 'Togo',
    'TK' : 'Tokelau',
    'TO' : 'Tonga',
    'TT' : 'Trinidad e Tobago',
    'TN' : 'Tunisia',
    'TR' : 'Turchia',
    'TM' : 'Turkmenistan',
    'TC' : 'Turks e Caicos',
    'TV' : 'Tuvalu',
    'UG' : 'Uganda',
    'UA' : 'Ukraina',
    'AE' : 'Emirati Arabi Uniti',
    'GB' : 'Regno Unito',
    'US' : 'Stati Uniti d\'America',
    'UM' : 'Isole minori esterne degli Stati Uniti d\'America',
    'UY' : 'Uruguay',
    'UZ' : 'Uzbekistan',
    'VU' : 'Vanuatu',
    'VE' : 'Venezuela',
    'VN' : 'Vietnam',
    'VG' : 'Isole Vergini britanniche',
    'VI' : 'Isole Vergini americane',
    'WF' : 'Wallis e Futuna',
    'EH' : 'Sahara Occidentale',
    'YE' : 'Yemen',
    'ZM' : 'Zambia',
    'ZW' : 'Zimbabwe'
};

let months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
              'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

/**
* Handle multiple requests at once
* @param urls [array]
* @param callback [function]
* @requires request module for node ( https://github.com/mikeal/request )
*/

module.exports = {
  zeroarg: function (message) {
    const zeroarg = new Discord.RichEmbed().setColor(0xC80000)
      .setDescription("***Questo comando non necessita di alcun argomento per funzionare !***");
    message.channel.send({embed: zeroarg});
  },
  morearg: function (message) {
    const morearg = new Discord.RichEmbed().setColor(0xC80000)
      .setDescription("***Questo comando ha bisogno di un argomento o più per venire usato !***");
    message.channel.send({embed: morearg});
  },
  onearg: function (message) {
    const onearg = new Discord.RichEmbed().setColor(0xC80000)
      .setDescription("***Questo comando ha bisogno di SOLO UN argomento per funzionare !***");
    message.channel.send({embed: onearg});
  },
  twoarg: function (message) {
    const twoarg = new Discord.RichEmbed().setColor(0xC80000)
      .setDescription("***Questo comando ha bisogno di SOLO DUE argomenti per funzionare !***");
    message.channel.send({embed: twoarg});
  },
  colorbynumber: function (num) {
    if (num < 100) return 0x00DC00;
    if (num < 400) return 0xFFDC00;
    if (num < 700) return 0xFF6400;
    if (num < 1000) return 0xC80000;
    if (num >= 1000) return 0x000000;
  },
  colorbystatus: function (status) {
    if (status === 0) return 0x747F8D;
    if (status === 1) return 0x2C82EC;
    if (status === 2) return 0xF04747;
    if (status === (3 || 4)) return 0xFAA61A;
    if (status === (5 || 6)) return 0x2C82EC;
  },
  IsoConv: function (timestamp) {
    let a = new Date(timestamp);
    let year = a.getFullYear();
    let month = months[a.getMonth()];
    let day = a.getDate();
    let hour = a.getHours();
    let min = a.getMinutes();
    let sec = a.getSeconds();
    if (day < 10) day = "0" + day;
    if (hour < 10) hour = "0" + hour;
    if (min < 10) min = "0" + min;
    if (sec < 10) sec = "0" + sec;
    let time = day + ' ' + month + ' ' + year + ' alle ' + hour + ':' + min + ':' + sec;
    return time;
  },
  SRKTourDate: function (timestamp) {
    let a = new Date(timestamp);
    let year = a.getFullYear();
    let month = months[a.getMonth()];
    let day = a.getDate();
    if (day < 10) day = "0" + day;
    let time = day + ' ' + month + ' ' + year;
    return time;
  },
  UnixConv: function (timestamp) {
    let a = new Date(timestamp * 1000);
    let year = a.getFullYear();
    let month = months[a.getMonth()];
    let day = a.getDate();
    let hour = a.getHours();
    let min = a.getMinutes();
    let sec = a.getSeconds();
    if (day < 10) day = "0" + day;
    if (hour < 10) hour = "0" + hour;
    if (min < 10) min = "0" + min;
    if (sec < 10) sec = "0" + sec;
    let time = day + ' ' + month + ' ' + year + ' alle ' + hour + ':' + min + ':' + sec ;
    return time;
  },
  getCountryName: function (countryCode) {
    if (isoCountries.hasOwnProperty(countryCode)) return isoCountries[countryCode];
    else return countryCode;
  }
};
