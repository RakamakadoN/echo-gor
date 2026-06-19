/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { registerMvpApi } from './server/mvpApi';

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
app.use(express.json());
registerMvpApi(app);

// Configure client routing
const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000; // Must strictly run on port 3000 as per runtime environment facts

if (!isProduction) {
  // Integrate Vite dev server middleware in local development
  import('vite').then((viteModule) => {
    viteModule.createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    }).then((viteServer) => {
      app.use(viteServer.middlewares);
      
      app.use('*', async (req, res, next) => {
        const url = req.originalUrl;
        try {
          const indexHtmlPath = path.resolve('.', 'index.html');
          let template = fs.readFileSync(indexHtmlPath, 'utf-8');
          template = await viteServer.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          viteServer.ssrFixStacktrace(e as Error);
          next(e);
        }
      });

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Dance Academy OS] Dev Server is listening on http://localhost:${PORT}`);
      });
    });
  });
} else {
  // Serve static files in production
  const distPath = path.resolve(__dirname, '..', 'dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Dance Academy OS] Production Server running on port ${PORT}`);
  });
}
