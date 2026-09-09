const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const express = require('express');
const cors = require('cors');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const FASTAPI_WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:8000/whatsapp/webhook';

let sock = null;
let isConnected = false;
let currentQrRaw = null;
let currentQrDataUrl = null;
let connectedUser = null;

const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            currentQrRaw = qr;
            console.log('\n--- SCAN THIS QR CODE TO CONNECT WHATSAPP ---');
            qrcodeTerminal.generate(qr, { small: true });
            try {
                currentQrDataUrl = await QRCode.toDataURL(qr);
            } catch (err) {
                console.error('Error generating QR Data URL:', err);
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = (statusCode !== DisconnectReason.loggedOut);
            console.log(`Connection closed (status ${statusCode}). Reconnecting:`, shouldReconnect);
            isConnected = false;
            connectedUser = null;

            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Logged out. Wiping session credentials...');
                currentQrRaw = null;
                currentQrDataUrl = null;
                deleteAuthCredentials();
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected successfully!');
            isConnected = true;
            currentQrRaw = null;
            currentQrDataUrl = null;
            if (sock?.user) {
                connectedUser = {
                    id: sock.user.id,
                    name: sock.user.name || sock.user.notify
                };
            }
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

function deleteAuthCredentials() {
    try {
        if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            console.log('Auth credentials directory deleted.');
        }
    } catch (err) {
        console.error('Failed to delete auth folder:', err);
    }
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

// GET STATUS Endpoint
app.get('/status', (req, res) => {
    return res.json({
        connected: isConnected,
        qr: currentQrDataUrl,
        rawQr: currentQrRaw,
        user: connectedUser
    });
});

// GET QR Endpoint
app.get('/qr', (req, res) => {
    return res.json({
        qr: currentQrDataUrl,
        rawQr: currentQrRaw,
        connected: isConnected
    });
});

// DISCONNECT / LOGOUT Endpoint
app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout().catch(() => {});
        }
        isConnected = false;
        connectedUser = null;
        currentQrRaw = null;
        currentQrDataUrl = null;
        deleteAuthCredentials();
        setTimeout(() => connectToWhatsApp(), 1000);
        return res.json({ status: 'disconnected', message: 'WhatsApp session ended. Generating new QR...' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Baileys WhatsApp Microservice running on http://localhost:${PORT}`);
    connectToWhatsApp();
});

