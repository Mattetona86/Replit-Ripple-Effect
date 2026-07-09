import { Router, type IRouter, type Request, type Response } from "express";
import {
  SearchTickersQueryParams,
  SearchTickersResponse,
  GetStockAnalysisQueryParams,
  GetStockAnalysisResponse,
} from "@workspace/api-zod";
import { searchTickers, getStockAnalysis } from "../lib/market/service";

const router: IRouter = Router();

router.get("/market/tickers/search", async (req: Request, res: Response): Promise<void> => {
  const params = SearchTickersQueryParams.parse(req.query);
  const results = await searchTickers(params.query);
  res.json(SearchTickersResponse.parse(results));
});

router.get("/market/stocks/analysis", async (req: Request, res: Response): Promise<void> => {
  const params = GetStockAnalysisQueryParams.parse(req.query);
  const timeframe = params.timeframe ?? "1Y";
  const language = params.language ?? "en";

  const analysis = await getStockAnalysis(params.symbol, timeframe, language);
  if (!analysis) {
    res.status(404).json({ message: "Ticker not found" });
    return;
  }

  res.json(GetStockAnalysisResponse.parse(analysis));
});

export default router;
