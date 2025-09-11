import { Router } from 'express';
import { OperationsController } from '../controllers/operations.controller';

const operationsRoutes = Router();

// RSS Scraping endpoints
operationsRoutes.post('/scrape', OperationsController.triggerRssScraping);

// Bot management endpoints
operationsRoutes.post('/bot/start', OperationsController.startBot);
operationsRoutes.post('/bot/stop', OperationsController.stopBot);
operationsRoutes.get('/bot/status', OperationsController.getBotStatus);

// Combined operations
operationsRoutes.post('/start-all', OperationsController.startAll);

export { operationsRoutes };
