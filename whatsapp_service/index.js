const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const express = require('express');
const qrcode = require('qrcode-terminal');
const path = require('path');
const pino = require('pino');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FASTAPI_WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:8000/whatsapp/webhook';

let sock = null;
let isConnected = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info_baileys'));
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n--- SCAN THIS QR CODE TO CONNECT WHATSAPP ---');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            isConnected = false;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected successfully!');
            isConnected = true;
        }
    });

    // Inbound Message Listener
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            if (!text) continue;

            const remoteJid = msg.key.remoteJid;
            if (!remoteJid || remoteJid.endsWith('@g.us')) continue; // ignore group messages for now

            const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');

            console.log(`[INBOUND] Message from ${senderPhone}: ${text}`);

            // Forward to FastAPI webhook
            try {
                const response = await fetch(FASTAPI_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: senderPhone,
                        message: text
                    })
                });
                const resData = await response.json();
                console.log(`[WEBHOOK RESPONSE] Status: ${response.status}`, resData);
            } catch (err) {
                console.error(`[WEBHOOK ERROR] Failed to reach FastAPI: ${err.message}`);
            }
        }
    });
}

// OUTBOUND Message Endpoint
app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Parameters "to" and "message" are required.' });
    }

    if (!isConnected || !sock) {
        return res.status(503).json({ error: 'WhatsApp client is not connected yet.' });
    }

    try {
        let cleanNumber = to.replace(/[^0-9]/g, '');
        // Handle local Pakistani formatting (e.g. 0300... -> 92300...)
        if (cleanNumber.startsWith('03')) {
            cleanNumber = '92' + cleanNumber.substring(1);
        }

        const jid = `${cleanNumber}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        console.log(`[OUTBOUND] Sent message to ${jid}`);
        return res.json({ status: 'sent', to: cleanNumber });
    } catch (err) {
        console.error(`[OUTBOUND ERROR] ${err.message}`);
        return res.status(500).json({ error: err.message });
    }
});

app.get('/status', (req, res) => {
    return res.json({ connected: isConnected });
});

app.listen(PORT, () => {
    console.log(`🚀 Baileys WhatsApp Microservice running on http://localhost:${PORT}`);
    connectToWhatsApp();
});
