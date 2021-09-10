const { color, name } = require('../config.json')
const Discord = require('discord.js')

module.exports = (description) => new Discord.MessageEmbed()
  .setColor(color.error)
  .setDescription(description)
  .setFooter(`${name} Error`)