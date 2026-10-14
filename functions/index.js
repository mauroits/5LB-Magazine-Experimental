import { onRequest } from 'firebase-functions/v2/https';
import { app } from './serverApp.js';

export const api = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  app
);
