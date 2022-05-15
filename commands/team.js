const Discord = require('discord.js')
const Team = require('../database/team')
const UserTeam = require('../database/userTeam')
const Steam = require('../functions/steam')
const Player = require('../functions/player')
const User = require('../database/user')
const errorCard = require('../templates/errorCard')
const { isInteractionSubcommandEqual, getInteractionOption, getCardsConditions } = require('../functions/commands')
const successCard = require('../templates/successCard')

const INFOS = 'infos'
const CREATE = 'create'
const DELETE = 'delete'
const UPDATE = 'update'
const ADD_USER = 'add_user'
const REMOVE_USER = 'remove_user'
const maxLengthTeamName = 14

const createTeam = async (interaction, currentTeam, user) => {
  if (currentTeam) return errorCard(`You already own the team: **${currentTeam.name}**`)
  const teamName = getInteractionOption(interaction, 'name')
  const teamSlug = teamName.toLowerCase().replace(/\s/g, '-')
  if (teamName.length > maxLengthTeamName) return errorCard(`The team name must be less than ${maxLengthTeamName} characters`)
  else if (await Team.getTeamSlug(teamSlug)) return errorCard('A team with this name already exists')
  const access = getInteractionOption(interaction, 'access')
  Team.create(teamName, teamSlug, user, access)

  return successCard(`Your team: **${teamName}** has been created.`)
}

const infosTeam = async (currentTeam, user) => {
  const currentUser = await User.get(user)
  const userTeams = []

  if (currentUser) {
    const currentUserTeams = await UserTeam.getUserTeams(currentUser.steamId)
    if (currentUserTeams)
      userTeams.push(...await Promise.all(currentUserTeams.map(async (userTeam) => await Team.getTeamSlug(userTeam.slug))))
  }
  if (currentTeam) userTeams.push(currentTeam)
  if (userTeams.length === 0) return errorCard('You don\'t own a team and you aren\'t part of any team')

  const options = Array.from(new Set(userTeams.map(JSON.stringify)))
    .map(JSON.parse)
    .map(userteam => {
      return {
        label: userteam.name,
        description: `Get infos about the team ${userteam.name}`,
        value: JSON.stringify({
          tn: userteam.slug,
          u: user,
        })
      }
    })

  const row = new Discord.MessageActionRow()
    .addComponents(
      new Discord.MessageSelectMenu()
        .setCustomId('teamInfosSelector')
        .setPlaceholder('Select a team')
        .addOptions(options.slice(0, 24)))

  return {
    components: [
      row
    ]
  }
}

const updateTeam = async (interaction, currentTeam) => {
  const teamName = getInteractionOption(interaction, 'name')
  const teamSlug = teamName?.toLowerCase().replace(/\s/g, '-')
  if (teamName && await Team.getTeamSlug(teamSlug)) return errorCard('A team with this name already exists')
  const access = getInteractionOption(interaction, 'access')
  Team.update(currentTeam.slug, teamName || currentTeam.name, teamSlug || currentTeam.slug, access)
  return successCard(`Your team: **${teamName || currentTeam.name}** has been updated.`)
}

const deleteTeam = async (currentTeam, user) => {
  Team.remove(user)
  UserTeam.getTeamUsers(currentTeam.slug)
    .then(users => {
      users.forEach(user => UserTeam.remove(user.steamId, currentTeam.slug))
    })

  return successCard(`Your team (**${currentTeam.name}**) has been deleted.`)
}

const addUser = async (interaction, steamParam) => {
  const user = interaction.user.id
  const currentTeam = await Team.getCreatorTeam(user)
  const steamId = await Steam.getId(steamParam)
  const steamDatas = await Steam.getDatas(steamId)
  const playerId = await Player.getId(steamId)
  const playerDatas = await Player.getDatas(playerId)

  if (await UserTeam.getUserTeam(steamId, currentTeam.slug))
    return errorCard(`**${playerDatas.nickname}** is already part of the team **${currentTeam.name}**`)

  UserTeam.create(currentTeam.slug, steamId)

  return successCard(`**${playerDatas.nickname}** has been added to the team **${currentTeam.name}**, [Steam](${steamDatas.profileurl}) - [Faceit](https://www.faceit.com/fr/players/${playerDatas.nickname})`)
}

const removeUser = async (interaction, steamParam) => {
  const user = interaction.user.id
  const currentTeam = await Team.getCreatorTeam(user)

  const steamId = await Steam.getId(steamParam)
  const playerId = await Player.getId(steamId)
  const playerDatas = await Player.getDatas(playerId)

  if (!await UserTeam.getUserTeam(steamId, currentTeam.slug))
    return errorCard(`**${playerDatas.name}** is not part of the team **${currentTeam.name}**`)

  UserTeam.remove(steamId, currentTeam.slug)

  return successCard(`**${playerDatas.nickname}** has been removed from the team **${currentTeam.name}**`)
}

module.exports = {
  name: 'team',
  options: [
    {
      name: INFOS,
      description: 'Get informations about your team.',
      type: 1,
      slash: true
    },
    {
      name: CREATE,
      slashDescription: 'create your team',
      type: 1,
      slash: true,
      options: [
        {
          name: 'name',
          description: `name of your team, up to ${maxLengthTeamName} characters`,
          type: 3,
          required: true
        },
        {
          name: 'access',
          description: 'let others discord users access your team if they are not in the team',
          type: 5,
          required: true
        }
      ]
    },
    {
      name: UPDATE,
      slashDescription: 'update your team',
      type: 1,
      slash: true,
      options: [
        {
          name: 'access',
          description: 'let others discord users access your team if they are not in the team',
          type: 5,
          required: true
        },
        {
          name: 'name',
          description: 'name of your team',
          type: 3,
          required: false
        }
      ]
    },
    {
      name: DELETE,
      slashDescription: 'delete your team',
      type: 1,
      slash: true
    },
    {
      name: ADD_USER,
      slashDescription: 'add a user to your team',
      type: 1,
      slash: true,
      options: [
        {
          name: 'parameters',
          description: 'steamIDs / steam custom IDs / url of one or more steam profiles / CSGO status. (Max 5)',
          type: 3,
          required: true
        }
      ]
    },
    {
      name: REMOVE_USER,
      slashDescription: 'remove a user from your team',
      type: 1,
      slash: true,
      options: [
        {
          name: 'parameters',
          description: 'steamID / steam custom ID / url of one steam profiles / CSGO status. (Max 1)',
          type: 3,
          required: true
        }
      ]
    }
  ],
  description: 'Create a team and link up to 5 users to it (limited to 1 team by discord account).',
  usage: ':\n`create` [team name]\n`delete`\n`update` [access] {name}\n`infos`\n`add_user` [steamID / steam custom ID / url of one steam profile / @user / CSGO status]\n`remove_user` [steamID / steam custom ID / url of one steam profile / @user / CSGO status]',
  type: 'utility',
  async execute(interaction) {
    const user = interaction.user.id
    const currentTeam = await Team.getCreatorTeam(user)

    if (!currentTeam && !isInteractionSubcommandEqual(interaction, CREATE) &&
      !isInteractionSubcommandEqual(interaction, INFOS)) return errorCard('You don\'t own a team')
    else if (isInteractionSubcommandEqual(interaction, CREATE)) return createTeam(interaction, currentTeam, user)
    else if (isInteractionSubcommandEqual(interaction, INFOS)) return infosTeam(currentTeam, user)
    else if (isInteractionSubcommandEqual(interaction, UPDATE)) return updateTeam(interaction, currentTeam, user)
    else if (isInteractionSubcommandEqual(interaction, DELETE)) return deleteTeam(currentTeam, user)
    else if (isInteractionSubcommandEqual(interaction, ADD_USER)) {
      const teamUsers = await UserTeam.getTeamUsers(currentTeam.slug)
      if (teamUsers.length >= 5) return errorCard('You can\'t add more than 5 users to your team')
      return getCardsConditions(interaction, addUser, 5 - teamUsers.length)
    } else if (isInteractionSubcommandEqual(interaction, REMOVE_USER)) return getCardsConditions(interaction, removeUser, 5)
    else return errorCard('Unknown subcommand')
  }
}