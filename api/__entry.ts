/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Точка входа для Vercel Serverless (api/[...path]).
 * Бандлится в api/[...path].js: `npm run build:api`.
 */
import "../server/loadEnv";
import express from "express";
import { registerMvpApi } from "../server/mvpApi";
import { registerGeminiApi } from "../server/geminiApi";
import { registerMagomedApi } from "../server/magomedApi";

const app = express();
// rawBody нужен вебхуку ApiPay: подпись HMAC считается от сырых байт тела.
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));
registerMvpApi(app);
registerGeminiApi(app);
registerMagomedApi(app);

export default app;
