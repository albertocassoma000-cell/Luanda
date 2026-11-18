import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/manager-chat', async (req, res) => {
  try {
    const { storeName, storeType, playerName, message, money } = req.body as {
      storeName?: string;
      storeType?: string;
      playerName?: string;
      message?: string;
      money?: number;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Mensagem vazia.' });
      return;
    }

    const prompt = `És o gerente simpático e realista da loja "${storeName || 'Loja de Luanda'}" (tipo: ${storeType || 'comércio'}) em Luanda, Angola.
O cliente chama-se ${playerName || 'Cliente'} e tem ${money ?? 0} Kz.
O cliente está ao balcão e acabou de dizer: "${message.trim()}".
Responde em português de Angola natural, curto e direto (máximo 18 palavras, sem aspas nem emojis) para caber num balão de fala em cima da tua cabeça 3D.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    const reply =
      response.text?.trim() ||
      'Com certeza! Pode escolher no balcão o que precisa, estamos aqui para ajudar.';

    res.json({ reply });
  } catch (err) {
    console.error('Manager AI error:', err);
    res.status(500).json({
      error: 'Erro ao comunicar com o gerente.',
      reply: 'Desculpe, pode repetir? Já abri o catálogo aqui no balcão para si.',
    });
  }
});

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
