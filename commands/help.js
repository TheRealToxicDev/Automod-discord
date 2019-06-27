let cooldown = new Map()

const info = "Everyone:\n`!am help`\n\nOwner + Mods:\n`!am enable`\nEnables automod in this channel\n\n`!am disable`\nDisables automod in this channel\n\n`!am settings modrole @role`\nSets the modrole. Everyone with this role can control the bot.\n\n`!am settings modrole`\nShows the current modrole\n\n`!am settings modrole exempt [true | false]`\nMakes the modrole (not) exempt from punishments\n\n!am settings threshold 1-99`\nThis defines how confident the bot has to be that a message is toxic in order to classify it as such. Default is 85%\n\n`!am settings threshold`\nShows the current value of threshold\n\n`!am settings tags [identity_attack | insult | obscene | severe_toxicity | threat | toxicity] [true | false]`\nSets one of the tags to either true or false. Every message gets classified with those tags. If you set one or multiple of these tags to true messages that don't get classified with those tags will be ignored. If all tags are off the bot will react to messages that contain any of the tags\n\n`!am settings tags`\nShows the current settings for the tags\n\n`!am settings log #logchannel`\nSets a channel to send logs of actions performed by the bot to\n\n`!am settings log off`\nDisables logging\n\n`!am settings log`\nShows the current logging channel\n\n`!am settings punishment [delete | temp_mute | kick | softban | ban] [0-1000 | off]`\nYou can specify what punishment a user should recieve after x amount of infractions. e.g. !am settings temp_mute 5 will cause the bot to mute the user after every 5 toxic messages. Setting a punishment to 0 will cause it to execute on every toxic message\n\n`!am settings punishment`\nShows the current settings for punishments\n\n`!am settings muterole @role`\nSets the role that the bot will give to temporarily mute users\n\n`!am settings muterole`\nShows the current muterole\n\n`!am settings muteduration 1-50000`\nSets the mute duration in seconds\n\n`!am info [@user | userid]`\nShows how often a user recieved a punishment\n\n`!am info reset [@user | userid]`\nResets all info on that user"

module.exports = {
    name: "help",
    execute(memDB, Database, Discord, message, args) {
        if (cooldown.has(message.author.id)) return

        message.channel.send(info)
        .catch(console.error)

        cooldown.set(message.author.id)

        setTimeout(() => {
            cooldown.delete(message.author.id)
        }, 30000)
    }
}
