/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Точка входа для Vercel Serverless (api/[...path]).
 * Бандлится в api/[...path].js: `npm run build:api`.
 */
import express from "express";
import { registerMvpApi } from "../server/mvpApi";
import { registerGeminiApi } from "../server/geminiApi";

const app = express();
app.use(express.json());
registerMvpApi(app);
registerGeminiApi(app);

export default app;
