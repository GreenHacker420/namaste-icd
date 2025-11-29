import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';
import { createApp } from '../src/index.js';

const app = createApp();

export default handle(app);
