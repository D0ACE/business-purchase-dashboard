import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const port = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini Client server-side ONLY. API Key is never sent to the browser.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('WARNING: GEMINI_API_KEY environment variable is not defined.');
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey || 'DUMMY_KEY_FOR_BUILD',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Server-side AI Business Assistant
  app.post('/api/advisor', async (req, res) => {
    try {
      const { prompt, analysisContext } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!apiKey || apiKey === 'DUMMY_KEY_FOR_BUILD') {
        return res.status(200).json({ 
          text: "⚠️ Gemini API key is missing or not configured. To enable live AI Insights, please add a valid `GEMINI_API_KEY` in the AI Studio Settings under 'Secrets'." 
        });
      }

      const systemInstruction = `
You are an expert Chief Business Intelligence Officer & Retail Strategist. 
You are analyzing a customer purchase history dataset for a retail company.
Your goal is to provide highly precise, practical, and action-oriented diagnostic insights based on the context JSON provided.
Never include long chatty pleasantries or generic marketing preambles. Start answering directly.
Focus on identifying high-impact marketing actions, inventory optimization, seasonal trends, and demographic anomalies.
Always format with bold headings and clean bullet points. Keep your answer under 250 words total.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { text: `Current filtered business performance summary context: ${JSON.stringify(analysisContext || {})}` },
          { text: `Client query: ${prompt}` }
        ],
        config: {
          systemInstruction,
          temperature: 0.6,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Advisor API Error:', error);
      res.status(500).json({ error: error.message || 'Error processing your business advisory query.' });
    }
  });

  // Route: check if API is available
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', hasKey: !!apiKey && apiKey !== 'DUMMY_KEY_FOR_BUILD' });
  });

  // Handle Static Files & Vite Assets
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    
    app.use(vite.middlewares);
    
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(url, `
          <!doctype html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Business Purchase Dashboard</title>
            </head>
            <body class="bg-slate-50 text-slate-900 font-sans">
              <div id="root"></div>
              <script type="module" src="/src/main.tsx"></script>
            </body>
          </html>
        `);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  app.listen(port, () => {
    console.log(`[BI SERVER] Server launched successfully at http://localhost:${port}`);
  });
}

startServer();
