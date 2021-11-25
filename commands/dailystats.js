const Discord = require('discord.js')
const Steam = require('../functions/steam')
const Player = require('../functions/player')
const errorCard = require('../templates/errorCard')
const { getCardsConditions } = require('../functions/commands')

const sendCardWithInfos = async (message, steamParam) => {
  try {
    const steamId = await Steam.getId(steamParam)
    const playerId = await Player.getId(steamId)
    const playerDatas = await Player.getDatas(playerId)

    const options = []
    const dates = []
    const maxMatch = 85

    const playerHistory = await Player.getHistory(playerId, maxMatch)

    for (const e of playerHistory.items) {
      const matchDate = new Date(e.finished_at * 1000).setHours(0, 0, 0, 0)
      if (!dates.filter(e => e === matchDate).length > 0) dates.push(matchDate)
    }

    dates.sort().reverse().every((d, k) => {
      if (k <= 24) {
        options.push({
          label: new Date(d).toDateString(),
          value: JSON.stringify({
            s: steamId,
            f: d,
            t: new Date(d).setHours(24),
            u: message.author.id,
            m: maxMatch
          })
        })
        return true
      } else return false
    })

    if (options.length === 0) return errorCard(`Couldn\'t get matchs of ${playerDatas.nickname}`)
    const row = new Discord.MessageActionRow()
      .addComponents(
        new Discord.MessageSelectMenu()
          .setCustomId('dateStatsSelector')
          .setPlaceholder('No dates selected')
          .addOptions(options))

    return {
      content: `Select one of the following dates to get the stats related (${playerDatas.nickname})`,
      components: [row]
    }
  } catch (error) {
    console.log(error)
    return errorCard(error)
  }
}

module.exports = {
  name: 'dailystats',
  aliasses: ['dailystats', 'ds'],
  options: [
    {
      name: 'steam_parameters',
      description: 'steamIDs / steam custom IDs / url of one or more steam profiles / CSGO status.',
      required: true,
      type: 3,
    },
    {
      name: 'user_mentions',
      description: '@users that has linked their profiles to the bot.',
      required: false,
      type: 6,
    },
    {
      name: 'parameters',
      slashDescription: 'steamIDs / steam custom IDs / url of one or more steam profiles / @users / CSGO status.',
      required: false,
      type: 3,
      slash: true
    }
  ],
  description: "Displays the stats of the choosen day. With elo graph of the day.",
  usage: 'multiple steam params and @user or CSGO status, max 10 users',
  type: 'stats',
  async execute(message, args) {
    return getCardsConditions(message, args, sendCardWithInfos)
  }
}