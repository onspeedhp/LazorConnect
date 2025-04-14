import type { Express } from 'express';
import { createServer, type Server } from 'http';
import fs from 'fs/promises';
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for demonstration purposes
  app.get('/api/solana/balance/:address', async (req, res) => {
    try {
      // In a real app, this would query the Solana blockchain
      // Mocked for demo purposes
      const { address } = req.params;
      res.json({
        address,
        balance: 2.45,
        usdValue: 49.32,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  });

  app.post('/api/solana/transaction', async (req, res) => {
    try {
      const { from, to, amount, connectionMethod } = req.body;

      // In a real app, this would submit a transaction to the Solana blockchain
      // Mocked for demo purposes
      res.json({
        success: true,
        txHash: 'mock_tx_' + Date.now(),
        confirmationTime: connectionMethod === 'passkey' ? '0.8s' : '2.5s',
        fee: 0.000005,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process transaction' });
    }
  });

  app.post('/api/logs', async (req, res) => {
    const formatLogMessage = (logData: any) => {
      const timestamp = new Date().toISOString();
      const details = logData.data
        ? JSON.stringify(logData.data, null, 2)
        : 'No details';

      return `
        [${timestamp}] ${logData.level.toUpperCase()}
        Message: ${logData.message}
        Details: ${details}
        Session: ${logData.sessionId}
        UserAgent: ${logData.userAgent}
        ----------------------------------------
        `;
    };

    try {
      const logData = req.body;
      const formattedLog = formatLogMessage(logData);

      // Print to console
      console.log('\x1b[36m%s\x1b[0m', formattedLog); // Cyan color for visibility

      res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        logId: Date.now(),
        formatted: formattedLog,
      });
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', 'Error handling log:', error); // Red color for errors
      res.status(500).json({
        error: 'Failed to process log',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
