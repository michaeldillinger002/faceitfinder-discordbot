const Discord = require('discord.js')
const Steam = require('../functions/steam')
const Player = require('../functions/player')
const errorCard = require('../templates/errorCard')
const { getCardsConditions } = require('../functions/commands')

const getFirstDay = (x) => {
  const a = new Date(x)
  a.setHours(0, 0, 0, 0)
  a.setDate(1)
  return a
}

const sendCardWithInfos = async (message, steamParam) => {
  try {
    const steamId = await Steam.getId(steamParam)
    const playerId = await Player.getId(steamId)
    const playerDatas = await Player.getDatas(playerId)

    const options = []
    const dates = []
    const maxMatch = 200

    const playerHistory = await Player.getHistory(playerId, maxMatch)

    for (const e of playerHistory.items) {
      const date = getFirstDay(e.finished_at * 1000).getTime()
      if (!dates.filter(e => e === date).length > 0) dates.push(date)
    }

    dates.sort().reverse().every((date, k) => {
      if (k <= 24) {
        const from = new Date(date)
        const to = new Date(date).setMonth(new Date(date).getMonth() + 1)

        options.push({
          label: `${from.toLocaleDateString('en-EN', { month: 'short', year: 'numeric' })}`,
          value: JSON.stringify({
            s: steamId,
            f: from.getTime(),
            t: to,
            u: message.author.id,
            m: maxMatch
          })
        })
        console.log(options)

        return true
      } else return false
    })

    if (options.length === 0) return errorCard(`Couldn\'t get today matches of ${playerDatas.nickname}`)
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
  name: 'monthstats',
  aliasses: ['monthstats', 'ms'],
  options: [
    {
      name: 'user_mention',
      description: 'Mention a user that has linked his profile to the bot.',
      required: false,
      type: 6,
      slash: true
    }
  ],
  description: "Displays your stats of the choosen month or the stats of the user(s) given. With elo graph of the month.",
  slashDescription: "Displays your stats of the choosen month or the stats of the @ user. With elo graph of the month.",
  usage: '',
  type: 'stats',
  async execute(message, args) {
    return await getCardsConditions(message.mentions.users, [], [], message, sendCardWithInfos)
  }
}