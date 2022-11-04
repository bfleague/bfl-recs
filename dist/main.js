"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingsBot = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const Discord = __importStar(require("discord.js"));
const WebSocket = __importStar(require("ws"));
const http_1 = require("http");
const pako_1 = __importDefault(require("pako"));
class RecordingsBot {
    constructor() {
        this._client = new Discord.Client({
            intents: 32767
        });
        this._client.on('ready', async () => {
            var _a;
            console.log(`Logged in as ${(_a = this._client.user) === null || _a === void 0 ? void 0 : _a.tag}!`);
        });
        const server = http_1.createServer();
        server.listen(process.env.WSS_PORT);
        const wss = new WebSocket.Server({ server: server });
        const address = wss.address();
        console.log(`Listening WebSocket at ${typeof address === "string" ? address : `${address.address}${address.port}`}`);
        wss.on('connection', (ws) => {
            ws.binaryType = "arraybuffer";
            ws.on('message', async (message) => {
                if (message instanceof ArrayBuffer) {
                    const channel = await this._client.channels.fetch(process.env.RECORDINGS_CHANNEL);
                    let size = parseInt(new TextDecoder().decode(message.slice(0, 32)), 2);
                    let dataString = new TextDecoder().decode(message.slice(32, 32 + size));
                    let data = JSON.parse(dataString);
                    let file = message.slice(32 + size, -1);
                    const attachment = new Discord.MessageAttachment(Buffer.from(file), `${data.id}.hbr2`);
                    let playersRed = "Nenhum jogador encontrado.";
                    let playersBlue = "Nenhum jogador encontrado.";
                    if (data.teamsHistory) {
                        let red = data.teamsHistory.filter((p) => p.team === 1);
                        let blue = data.teamsHistory.filter((p) => p.team === 2);
                        if ((red === null || red === void 0 ? void 0 : red.length) > 0)
                            playersRed = [...new Set(red.map((p) => { var _a; return `${p.name} (${(_a = p.points) !== null && _a !== void 0 ? _a : 0})`; }))].join("\n");
                        if ((blue === null || blue === void 0 ? void 0 : blue.length) > 0)
                            playersBlue = [...new Set(blue.map((p) => { var _a; return `${p.name} (${(_a = p.points) !== null && _a !== void 0 ? _a : 0})`; }))].join("\n");
                    }
                    if (playersRed.length > 1024)
                        playersRed = playersRed.slice(0, 1000) + "\n...";
                    if (playersBlue.length > 1024)
                        playersBlue = playersBlue.slice(0, 1000) + "\n...";
                    const infoURL = Buffer.from(pako_1.default.gzip(dataString)).toString('base64');
                    const matchURL = `https://www.bfleague.online/#/match/${encodeURIComponent(infoURL)}`;
                    console.log(matchURL + "\n" + +"\n\n");
                    const desc = `ID: ${data.id}\n**[Clique aqui para ver os stats no nosso site](${matchURL})**`;
                    const embed = new Discord.MessageEmbed().setColor("BLURPLE").setTimestamp();
                    const files = [attachment];
                    if (desc.length > 4096) {
                        embed.setDescription(`ID: ${data.id}`);
                        files.push(new Discord.MessageAttachment(matchURL, `${data.id}-Stats-Link.txt`));
                    }
                    else {
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
exports.RecordingsBot = RecordingsBot;
new RecordingsBot();
