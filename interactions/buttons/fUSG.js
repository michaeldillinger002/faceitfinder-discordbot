const { sendCardWithInfo } = require('../../commands/last')
const CommandsStats = require('../../database/commandsStats')
const loadingCard = require('../../templates/loadingCard')

/**
 * Find user stats graph.
 */
module.exports = {
  name: 'fUSG',
  async execute(interaction, json) {
    const value = JSON.parse(interaction.message.components.at(0).components.at(0).options.at(0).value)

    if (interaction.user.id !== value.u) return

    CommandsStats.create('find', 'button - player', interaction.createdAt)

    const players = interaction.message.components.at(3)?.components.map(p => JSON.parse(p.customId).s)

    loadingCard(interaction)

    return sendCardWithInfo(interaction, json.s, null, json.page, players)
  }
}