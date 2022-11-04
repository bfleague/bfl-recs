import * as dotenv from "dotenv";
dotenv.config();

import * as Discord from 'discord.js';
import * as WebSocket from "ws";
import { createServer } from "http";
import Pako from 'pako';

export class RecordingsBot {
    private _client = new Discord.Client({
        intents: 32767
    });

    constructor() {
        this._client.on('ready', async () => {
            console.log(`Logged in as ${this._client.user?.tag}!`);
        });

        const server = createServer();
        server.listen(process.env.WSS_PORT);

        const wss = new WebSocket.Server({ server: server });

        const address = wss.address();

        console.log(`Listening WebSocket at ${typeof address === "string" ? address : `${address.address}${address.port}`}`)

        wss.on('connection', (ws) => {
            ws.binaryType = "arraybuffer";

            ws.on('message', async (message) => {
                if (message instanceof ArrayBuffer) {
                    const channel = await this._client.channels.fetch(process.env.RECORDINGS_CHANNEL as string) as Discord.TextChannel;
                    
                    let size = parseInt(new TextDecoder().decode(message.slice(0, 32)), 2);

                    let dataString = new TextDecoder().decode(message.slice(32, 32 + size));
                    let data = JSON.parse(dataString);
                    let file = message.slice(32 + size, -1);

                    const attachment = new Discord.MessageAttachment(Buffer.from(file), `${data.id}.hbr2`);

                    let playersRed = "Nenhum jogador encontrado.";
                    let playersBlue = "Nenhum jogador encontrado.";

                    if (data.teamsHistory) {
                        let red = data.teamsHistory.filter((p: any) => p.team === 1);
                        let blue = data.teamsHistory.filter((p: any) => p.team === 2);

                        if (red?.length > 0) playersRed = [...new Set(red.map((p: any) => `${p.name} (${p.points ?? 0})`))].join("\n");
                        if (blue?.length > 0) playersBlue = [...new Set(blue.map((p: any) => `${p.name} (${p.points ?? 0})`))].join("\n");
                    }

                    if (playersRed.length > 1024) playersRed = playersRed.slice(0, 1000) + "\n...";
                    if (playersBlue.length > 1024) playersBlue = playersBlue.slice(0, 1000) + "\n...";

                    const infoURL = Buffer.from(Pako.gzip(dataString)).toString('base64');
                    const matchURL = `https://www.bfleague.online/#/match/${encodeURIComponent(infoURL)}`;

                    console.log(matchURL + "\n" +   + "\n\n");

                    const desc = `ID: ${data.id}\n**[Clique aqui para ver os stats no nosso site](${matchURL})**`;
                    const embed = new Discord.MessageEmbed().setColor("BLURPLE").setTimestamp();
                    const files = [attachment];

                    if (desc.length > 4096) {
                        embed.setDescription(`ID: ${data.id}`);
                        files.push(new Discord.MessageAttachment(matchURL, `${data.id}-Stats-Link.txt`));
                    } else {
                        embed.setDescription(desc);
                    }

                    embed
                        .setTitle(`${data.redName} ${data.redGoals} x ${data.blueGoals} ${data.blueName}`)
                        .addField("Red", playersRed, true)
                        .addField("Blue", playersBlue, true);

                    if (matchURL.length < 2048) {
                        embed.setURL(matchURL);
                    } 

                    channel.send({ embeds: [embed], files: files });

                    ws.send(JSON.stringify({ id: data.id }));
                }
            });
        });

        this._client.login(process.env.DISCORD_TOKEN);
    }
}

new RecordingsBot();