# Automod-discord

This project was created for the discord hack week 2019.

If you have an issue or a feature request please feel free to open an issue.

## What is this?

Automod-discord is a bot that provides automoderation capabilities. It uses the [Toxicity classifier](https://github.com/tensorflow/tfjs-models/tree/master/toxicity) by Tensorflow to automatically detect toxic messages.

The bot is highly configurable. You can specify what punishment a user should recieve after x amount of toxic messages. e.g. Deleting every toxic message and muting a user after every 5 toxic messages.

**I currently have no publicly available version of this bot running. If you want to have this bot on your server please host it yourself or ask someone who hosts an instance of this bot to invite it to your server.**

## Hosting

If you want to host this bot follow the instructions below.

1. Clone this repo
2. Set up a bot account
3. Invite the bot to your server
4. Add your token to the config.json file
5. Install [Node.js](https://nodejs.org/en/download/)
6. Install discord.js, better-sqlite3 and @tensorflow/tfjs-node packages

If you don't know how to create a bot account, invite the bot to your server or where to get your token please follow this [Discord Bot 101 Guide](https://www.digitaltrends.com/gaming/how-to-make-a-discord-bot/) until step 4.

You should be good to go now. If you like you can use the profile picture i made for the bot. [Profile picture](./automod_profile_picture.png)

## Performance

Average processing time of a message.

|    Performance    |  Ryzen 5 2600  | Raspberry Pi 3b+ |
| :---------------: | :------------: | :--------------: |
|   10 characters   |    40 ms       |      398 ms      |
|  100 characters   |    203 ms      |      1497 ms     |
|  1000 characters  |    1810 ms     |      12947 ms    |

As you can see it takes quite long especially for longer messages. If you host the bot make sure that it's not on too many servers or otherwise the bot could start lagging behind.

Note: If the bot starts lagging behind it wont skip messages. It will still check every message one after the other.

## Commands

### Everyone:

> !am help

Shows this message

### Owner + Mods:

> !am enable

Enables automod in this channel

> !am disable

Disables automod in this channel

> !am settings modrole @role

Sets the modrole. Everyone with this role can control the bot.

> !am settings modrole

Shows the current modrole

> !am settings modrole exempt [true | false]

Makes the modrole (not) exempt from punishments, default is false

> !am settings modrole exempt

Shows the current settings for modrole exempt

> !am settings threshold 1-99

This defines how confident the bot has to be that a message is toxic in order to classify it as such. Default is 85%

> !am settings threshold

Shows the current value of threshold

> !am settings tags [identity_attack | insult | obscene | severe_toxicity | threat | toxicity] [true | false]

Sets one of the tags to either true or false. Every message gets classified with those tags. If you set one or multiple of these tags to true messages that don't get classified with those tags will be ignored. If all tags are off the bot will react to messages that contain any of the tags

> !am settings tags

Shows the current settings for the tags

> !am settings log #logchannel

Sets a channel to send logs of actions performed by the bot to

> !am settings log off

Disables logging

> !am settings log

Shows the current logging channel

> !am settings punishment [delete | temp_mute | kick | softban | ban] [0-1000 | off]

You can specify what punishment a user should recieve after x amount of infractions. e.g. !am settings temp_mute 5 will cause the bot to mute the user after every 5 toxic messages. Setting a punishment to 0 will cause it to execute on every toxic message

> !am settings punishment

Shows the current settings for punishments

> !am settings muterole @role

Sets the role that the bot will give to temporarily mute users. You have to set this role up yourself.

> !am settings muterole

Shows the current muterole

> !am settings muteduration 1-50000

Sets the mute duration in seconds

> !am info [@user | userid]

Shows how often a user recieved a punishment

> !am info reset [@user | userid]

Resets all info on that user
