import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import {
  SearchTickersQueryParams,
  SearchTickersResponse,
  GetStockAnalysisQueryParams,
  GetStockAnalysisResponse,
  ListSavedAnalysesResponse,
  SaveAnalysisBody,
  SaveAnalysisResponse,
  DeleteSavedAnalysisParams,
  NewsAnalysisRequest,
  RippleAnalysisRecord,
  GetRippleAnalysisParams,
} from "@workspace/api-zod";
import { searchTickers, getStockAnalysis } from "../lib/market/service";
import { FmpSubscriptionError } from "../lib/market/fmp-client";
import { YahooTimeoutError } from "../lib/market/yahoo-price-client";
import { getFundamentalAnalysis } from "../lib/market/fundamental-service";
import {
  listSavedAnalyses,
  saveAnalysis,
  deleteSavedAnalysis,
} from "../lib/market/saved-analyses";
import {
  GetFundamentalAnalysisQueryParams,
  GetFundamentalAnalysisResponse,
} from "@workspace/api-zod";
import { analyzeRipple, getRippleAnalysis } from "../lib/ripple-lab/ripple-service";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use(requireAuth);

router.get("/market/tickers/search", async (req: Request, res: Response): Promise<void> => {
  const params = SearchTickersQueryParams.parse(req.query);
  const results = await searchTickers(params.query);
  res.json(SearchTickersResponse.parse(results));
});

router.get("/market/stocks/analysis", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const params = GetStockAnalysisQueryParams.parse(req.query);
  const timeframe = params.timeframe ?? "1Y";
  const language = params.language ?? "en";

  try {
    const analysis = await getStockAnalysis(params.symbol, timeframe, language);
    if (!analysis) {
      res.status(404).json({ message: "Ticker not found" });
      return;
    }
    res.json(GetStockAnalysisResponse.parse(analysis));
  } catch (err) {
    if (err instanceof FmpSubscriptionError) {
      res.status(422).json({ error: `Ticker "${params.symbol}" is not available on the current data plan. Try a major US stock or ETF (e.g. NVDA, AAPL, SPY).` });
      return;
    }
    if (err instanceof YahooTimeoutError) {
      res.status(503).json({ error: `Data source took too long to respond for "${params.symbol}". Please try again in a few seconds.` });
      return;
    }
    next(err);
  }
});

router.get("/market/stocks/fundamental-analysis", async (req: Request, res: Response): Promise<void> => {
  const params = GetFundamentalAnalysisQueryParams.parse(req.query);
  const language = params.language ?? "en";
  const analysis = await getFundamentalAnalysis(params.symbol, language);
  if (!analysis) {
    res.status(404).json({ message: "Ticker not found or insufficient financial data" });
    return;
  }
  res.json(GetFundamentalAnalysisResponse.parse(analysis));
});

router.get("/market/saved", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  const rows = await listSavedAnalyses(userId!);
  res.json(ListSavedAnalysesResponse.parse(rows));
});

router.post("/market/saved", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  const body = SaveAnalysisBody.parse(req.body);
  const row = await saveAnalysis(userId!, body);
  res.json(SaveAnalysisResponse.parse(row));
});

router.delete("/market/saved/:id", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  const params = DeleteSavedAnalysisParams.parse(req.params);
  const deleted = await deleteSavedAnalysis(userId!, params.id);
  if (!deleted) {
    res.status(404).json({ message: "Saved analysis not found" });
    return;
  }
  res.status(204).end();
});

router.post("/market/ripple-lab/analyze", async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuth(req);
  const input = NewsAnalysisRequest.parse(req.body);
  const primaryTickers = input.primaryTickers?.map((t) => t.toUpperCase()).slice(0, 10);

  const record = await analyzeRipple(
    userId!,
    {
      headline: input.headline,
      body: input.body,
      source: input.source,
      url: input.url,
      publishedAt: input.publishedAt,
      primaryTickers,
    },
    input.language,
  );
  res.json(RippleAnalysisRecord.parse(record));
});

router.get("/market/ripple-lab/:id", async (req: Request, res: Response): Promise<void> => {
  const params = GetRippleAnalysisParams.parse(req.params);
  const record = await getRippleAnalysis(params.id);
  if (!record) {
    res.status(404).json({ message: "Analysis not found" });
    return;
  }
  res.json(RippleAnalysisRecord.parse(record));
});

export default router;
