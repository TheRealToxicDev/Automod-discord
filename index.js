const config = require("./config.json");
const classifier = require("./model.js");
const fs = require("fs");
const Database = require("better-sqlite3");
const Discord = require("discord.js");
const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require("./commands/" + file);
    client.commands.set(command.name, command);
}

const db = new Database("am.db", { fileMustExist: true });
const stmt = db.prepare("SELECT serverID, threshold, modRole, modRoleExempt, loggingChannel, muteRole, muteDuration, deleted, temp_mute, kick, softban, ban, identity_attack, insult, obscene, severe_toxicity, sexual_explicit, threat, toxicity FROM server_settings").all();
const stmt2 = db.prepare("SELECT serverID, channelID, am_enabled FROM data").all();
const stmt3 = db.prepare("SELECT serverID, userID, total_infractions, deleted, temp_mute, kick, softban, ban FROM user_data").all();
const stmt4 = db.prepare("SELECT serverID, userID, deleted, temp_mute, kick, softban, ban FROM user_data_internal").all();
db.close();

const memDB = {};

for (const row of stmt) {
    const server_id = row.serverID;
    if (!Object.prototype.hasOwnProperty.call(memDB, server_id)) {
        memDB[server_id] = { user_data: {}, user_data_internal: {} };
    }

    /*
    * Threshold is the minimum prediction confidence, a confidence under the specifed score will be ignored, default is 0.85
    * modRole is the id of the mod role that was set, default is null
    * loggingChannel is the id of the channel that the bot sends the logs to, default is null
    * muteRole is the id of the role that gets used to mute people, default is null
    * muteDuration is the time to mute someone in milliseconds
    * deleted, temp_mute, kick, softban and ban are values that specify after how many total infractions an action should be executed, default is 0 for deleted and -1 for everything else, a value of 0 means instantly, a value of -1 means never
    * Everything after that is the setting for a tag, if its true that means only messages that get classified with this tag get deleted, default is false
    */
    memDB[server_id].settings = { threshold: row.threshold, modRole: row.modRole, modRoleExempt: row.modRoleExempt, loggingChannel: row.loggingChannel, muteRole: row.muteRole, muteDuration: row.muteDuration, deleted: row.deleted, temp_mute: row.temp_mute, kick: row.kick, softban: row.softban, ban: row.ban, identity_attack: row.identity_attack, insult: row.insult, obscene: row.obscene, severe_toxicity: row.severe_toxicity, sexual_explicit: row.sexual_explicit, threat: row.threat, toxicity: row.toxicity };
}

for (const row of stmt2) {
    const server_id = row.serverID;
    const channel_id = row.channelID;
    // am_enabled is the setting that turns Automod on/off
    if (!Object.prototype.hasOwnProperty.call(memDB[server_id], channel_id)) {
        memDB[server_id][channel_id] = { am_enabled: row.am_enabled };
    }
}

for (const row of stmt3) {
    const server_id = row.serverID;
    const user_id = row.userID;
    // These count the amount of times a user recieved this specific punishment
    if (!Object.prototype.hasOwnProperty.call(memDB[server_id].user_data, user_id)) {
        memDB[server_id].user_data[user_id] = { total_infractions: row.total_infractions, deleted: row.deleted, temp_mute: row.temp_mute, kick: row.kick, softban: row.softban, ban: row.ban };
    }
}

for (const row of stmt4) {
    const server_id = row.serverID;
    const user_id = row.userID;
    // user_data_internal is used as a counter to check when to punish someone
    if (!Object.prototype.hasOwnProperty.call(memDB[server_id].user_data_internal, user_id)) {
        memDB[server_id].user_data_internal[user_id] = { deleted: row.deleted, temp_mute: row.temp_mute, kick: row.kick, softban: row.softban, ban: row.ban };
    }
}

console.log("Logging in");
client.login(config.token);

client.on("ready", () => {
    console.log("Logged in");
    const db = new Database("am.db", { fileMustExist: true });

    // This makes sure that we create objects for servers which were joined while the bot was off
    client.guilds.forEach(guild => {
        if (!Object.prototype.hasOwnProperty.call(memDB, guild.id)) {
            memDB[guild.id] = { user_data: {}, user_data_internal: {} };
            memDB[guild.id].settings = { threshold: 0.85, modRole: null, modRoleExempt: false, loggingChannel: null, muteRole: null, muteDuration: 0, deleted: 0, temp_mute: null, kick: null, softban: null, ban: null, identity_attack: false, insult: false, obscene: false, severe_toxicity: false, sexual_explicit: false, threat: false, toxicity: false };

            db.prepare("INSERT INTO server_settings (serverID) VALUES (?)").run(guild.id);
        }
    });

    // This deletes all servers that the bot left while offline
    for (const guild in memDB) {
        if (!client.guilds.has(guild)) {
            delete memDB[guild];

            db.prepare("DELETE FROM data WHERE serverID = ?").run(guild.id);
            db.prepare("DELETE FROM server_settings WHERE serverID = ?").run(guild.id);
            db.prepare("DELETE FROM muted_users WHERE serverID = ?").run(guild.id);
            db.prepare("DELETE FROM user_data WHERE serverID = ?").run(guild.id);
            db.prepare("DELETE FROM user_data_internal WHERE serverID = ?").run(guild.id);
        }
    }

    const muted_users = db.prepare("SELECT serverID, userID, muted_at, duration, mute_role FROM muted_users").all();

    // In case the bot muted a user and went offline this either unmutes the user if the mute duration is over or sets a new timeout
    // that way we can make sure we don't accidentally mute a user indefinitely
    if (muted_users.length) {
        for (const row of muted_users) {
            const elapsed_time = new Date().getTime() - row.muted_at;
            const member = client.guilds.get(row.serverID).members.get(row.userID);
            if (elapsed_time >= row.duration) {
                if (member) {
                    member.removeRole(row.mute_role).catch(console.error);
                }

                db.prepare("DELETE FROM muted_users WHERE serverID = ? AND userID = ?").run(row.serverID, row.userID);
            } else {
                if (member) {
                    const message = { guild: { id: row.serverID }, author: { id: row.userID }, member };
                    setTimeout(removeMute, row.duration - elapsed_time, message, row.mute_role).unref();
                } else {
                    db.prepare("DELETE FROM muted_users WHERE serverID = ? AND userID = ?").run(row.serverID, row.userID);
                }
            }
        }
    }

    db.close();
});

client.on("roleDelete", role => {
    // This sets mod roles or mute roles back to null if they get deleted to make sure we don't have old data in the db
    if (memDB[role.guild.id].settings.modRole == role.id) {
        memDB[role.guild.id].settings.modRole = null;

        const db = new Database("am.db", { fileMustExist: true });
        db.prepare("UPDATE server_settings SET modRole = ? WHERE serverID = ?").run(null, role.guild.id);
        db.close();
    }

    if (memDB[role.guild.id].settings.muteRole == role.id) {
        memDB[role.guild.id].settings.muteRole = null;

        const db = new Database("am.db", { fileMustExist: true });
        db.prepare("UPDATE server_settings SET muteRole = ? WHERE serverID = ?").run(null, role.guild.id);
        db.close();
    }
});

client.on("guildCreate", guild => {
    memDB[guild.id] = { settings: { threshold: 0.85, modRole: null, modRoleExempt: false, loggingChannel: null, muteRole: null, muteDuration: 0, deleted: 0, temp_mute: null, kick: null, softban: null, ban: null, identity_attack: false, insult: false, obscene: false, severe_toxicity: false, sexual_explicit: false, threat: false, toxicity: false } };

    const db = new Database("am.db", { fileMustExist: true });
    db.prepare("INSERT INTO server_settings (serverID) VALUES (?)").run(guild.id);
    db.close();
});

client.on("guildDelete", guild => {
    delete memDB[guild.id];

    const db = new Database("am.db", { fileMustExist: true });
    db.prepare("DELETE FROM data WHERE serverID = ?").run(guild.id);
    db.prepare("DELETE FROM server_settings WHERE serverID = ?").run(guild.id);
    db.prepare("DELETE FROM muted_users WHERE serverID = ?").run(guild.id);
    db.prepare("DELETE FROM user_data WHERE serverID = ?").run(guild.id);
    db.prepare("DELETE FROM user_data_internal WHERE serverID = ?").run(guild.id);
    db.close();
});

client.on("channelDelete", channel => {
    for (const server in memDB) {
        if (Object.prototype.hasOwnProperty.call(memDB[server], channel.id)) {
            delete memDB[server][channel.id];

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("DELETE FROM data WHERE serverID = ? AND channelID = ?").run(server, channel.id);
            db.close();
        }

        if (memDB[server].settings.loggingChannel == channel.id) {
            memDB[server].settings.loggingChannel = null;

            const db = new Database("am.db", { fileMustExist: true });
            db.prepare("UPDATE server_settings SET loggingChannel = ? WHERE serverID = ?").run(null, server);
            db.close();

            break;
        }
    }
});

client.on("message", async message => {
    if (message.author.bot || message.channel.type != "text") return;

    if (message.content.startsWith(config.prefix)) {
        const args = message.content.trim().slice(config.prefix.length).toLowerCase().split(/ +/);
        const commandName = args.shift();

        try {
            if (client.commands.has(commandName)) {
                const command = client.commands.get(commandName);
                command.execute(memDB, Database, Discord, message, args);
            }
        } catch(e) {
            console.error(e);
        }
    }

    const guild = memDB[message.guild.id];
    const channel_id = message.channel.id;

    if (!guild[channel_id]?.am_enabled) return;

    if (guild.settings.modRoleExempt && message.member.roles.has(guild.settings.modRole)) return;

    Promise.all(await classifier(message, memDB))
    .then(result => {
        if (tagDelete(message, result)) {
            punishment(message);
        } else if (result[6].match) {
            punishment(message);
        }
    })
    .catch(console.error);
});

// In case a message should only be deleted if it contains a specific tag this checks for it
function tagDelete(message, result) {
    const guild_settings = memDB[message.guild.id].settings;

    if (guild_settings.identity_attack && result[0].match ||
        guild_settings.insult && result[1].match ||
        guild_settings.obscene && result[2].match ||
        guild_settings.severe_toxicity && result[3].match ||
        guild_settings.sexual_explicit && result[4].match ||
        guild_settings.threat && result[5].match ||
        guild_settings.toxicity && result[6].match
    ) return true;

    return false;
}

function punishment(message) {
    const author_id = message.author.id;
    const guild_id = message.guild.id;
    const guild = memDB[guild_id];
    const guild_settings = guild.settings;
    const db = new Database("am.db", { fileMustExist: true });
    
    if (!guild.user_data[author_id]) {
        guild.user_data[author_id] = { total_infractions: 1, deleted: 0, temp_mute: 0, kick: 0, softban: 0, ban: 0 };
        guild.user_data_internal[author_id] = { deleted: 0, temp_mute: 0, kick: 0, softban: 0, ban: 0 };
        
        db.prepare("INSERT INTO user_data (serverID, userID, total_infractions) VALUES (?, ?, ?)").run(guild_id, author_id, guild.user_data[author_id].total_infractions);
        db.prepare("INSERT INTO user_data_internal (serverID, userID) VALUES (?, ?)").run(guild_id, author_id);
    } else {
        const user_data_internal = guild.user_data_internal[author_id];

        guild.user_data[author_id].total_infractions++;
        user_data_internal.deleted++;
        user_data_internal.temp_mute++;
        user_data_internal.kick++;
        user_data_internal.softban++;
        user_data_internal.ban++;
    }
    
    const user_data = guild.user_data[author_id];
    const user_data_internal = guild.user_data_internal[author_id];

    if (guild_settings.deleted != null && user_data_internal.deleted >= guild_settings.deleted) {
        message.delete()
        .catch(console.error);
        
        user_data.deleted++;
        user_data_internal.deleted = 0;

        db.prepare("UPDATE user_data SET deleted = ? WHERE serverID = ? AND userID = ?").run(user_data.deleted, guild_id, author_id);
        db.prepare("UPDATE user_data_internal SET deleted = ? WHERE serverID = ? AND userID = ?").run(user_data_internal.deleted, guild_id, author_id);

        if (guild_settings.loggingChannel) {
            client.channels.get(guild_settings.loggingChannel).send(new Discord.RichEmbed()
                .setColor("#0099ff")
                .setDescription("Deleted a message from <@" + author_id + "> in <#" + message.channel.id +">\n" + new Date().toUTCString())
            );
        }
    }

    if (guild_settings.temp_mute != null && user_data_internal.temp_mute >= guild_settings.temp_mute) {
        if (!message.member.roles.has(guild_settings.muteRole)) {
            message.member.addRole(guild_settings.muteRole)
            .catch(console.error);

            setTimeout(removeMute, guild_settings.muteDuration, message, guild_settings.muteRole).unref();

            user_data.temp_mute++;
            user_data_internal.temp_mute = 0;

            db.prepare("INSERT INTO muted_users (serverID, userID, muted_at, duration, mute_role) VALUES (?, ?, ?, ?, ?)").run(guild_id, author_id, new Date().getTime(), guild_settings.muteDuration, guild_settings.muteRole);
            db.prepare("UPDATE user_data SET temp_mute = ? WHERE serverID = ? AND userID = ?").run(user_data.temp_mute, guild_id, author_id);
            db.prepare("UPDATE user_data_internal SET temp_mute = ? WHERE serverID = ? AND userID = ?").run(user_data_internal.temp_mute, guild_id, author_id);

            if (guild_settings.loggingChannel) {
                client.channels.get(guild_settings.loggingChannel).send(new Discord.RichEmbed()
                    .setColor("#0099ff")
                    .setDescription("Muted <@" + author_id + "> for " + guild_settings.muteDuration / 1000 + " Seconds\n" + new Date().toUTCString())
                );
            }
        }
    }

    if (guild_settings.kick != null && user_data_internal.kick >= guild_settings.kick) {
        message.member.kick()
        .catch(console.error);

        user_data.kick++;
        user_data_internal.kick = 0;

        db.prepare("UPDATE user_data SET kick = ? WHERE serverID = ? AND userID = ?").run(user_data.kick, guild_id, author_id);
        db.prepare("UPDATE user_data_internal SET kick = ? WHERE serverID = ? AND userID = ?").run(user_data_internal.kick, guild_id, author_id);

        if (guild_settings.loggingChannel) {
            client.channels.get(guild_settings.loggingChannel).send(new Discord.RichEmbed()
                .setColor("#0099ff")
                .setDescription("Kicked <@" + author_id + ">\n" + new Date().toUTCString())
            );
        }
    }

    if (guild_settings.softban != null && user_data_internal.softban >= guild_settings.softban) {
        message.member.ban(7)
        .then(() => message.guild.unban(author_id))
        .catch(console.error);

        user_data.softban++;
        user_data_internal.softban = 0;

        db.prepare("UPDATE user_data SET softban = ? WHERE serverID = ? AND userID = ?").run(user_data.softban, guild_id, author_id);
        db.prepare("UPDATE user_data_internal SET softban = ? WHERE serverID = ? AND userID = ?").run(user_data_internal.softban, guild_id, author_id);

        if (guild_settings.loggingChannel) {
            client.channels.get(guild_settings.loggingChannel).send(new Discord.RichEmbed()
                .setColor("#0099ff")
                .setDescription("Softbanned <@" + author_id + ">\n" + new Date().toUTCString())
            );
        }
    }

    if (guild_settings.ban != null && user_data_internal.ban >= guild_settings.ban) {
        message.member.ban()
        .catch(console.error);

        user_data.ban++;
        user_data_internal.ban = 0;

        db.prepare("UPDATE user_data SET ban = ? WHERE serverID = ? AND userID = ?").run(user_data.ban, guild_id, author_id);
        db.prepare("UPDATE user_data_internal SET ban = ? WHERE serverID = ? AND userID = ?").run(user_data_internal.ban, guild_id, author_id);

        if (guild_settings.loggingChannel) {
            client.channels.get(guild_settings.loggingChannel).send(new Discord.RichEmbed()
                .setColor("#0099ff")
                .setDescription("Banned <@" + author_id + ">\n" + new Date().toUTCString())
            );
        }
    }

    db.close();
}

function removeMute(message, muteRole) {
    message.member.removeRole(muteRole).catch(console.error);

    const db = new Database("am.db", { fileMustExist: true });
    db.prepare("DELETE FROM muted_users WHERE serverID = ? AND userID = ?").run(message.guild.id, message.author.id);
    db.close();
}