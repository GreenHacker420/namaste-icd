import { handle } from '@hono/node-server/vercel';
import { Hono } from 'hono';
import { createApp } from '../src/index.js';

// Create the app instance using the factory from src/index.js
// We need to export createApp from src/index.js first, 
// but assuming we modify src/index.js to export it.
// If src/index.js doesn't export it, we might need to refactor src/index.js slightly.
// Let's check src/index.js content again. It defines createApp but doesn't export it.
// So I will need to modify src/index.js to export createApp.

const app = createApp();

export default handle(app);
