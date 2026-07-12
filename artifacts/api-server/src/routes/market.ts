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
} from "@workspace/api-zod";
import { searchTickers, getStockAnalysis } from "../lib/market/service";
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
import { analyzeRipple } from "../lib/ripple-lab/ripple-service";

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
  const body = req.body as Record<string, unknown>;

  const headline = typeof body.headline === "string" ? body.headline.trim() : "";
  if (!headline) {
    res.status(400).json({ error: "headline is required" });
    return;
  }

  const language = body.language === "it" ? "it" : "en";

  const tickers = Array.isArray(body.primaryTickers)
    ? (body.primaryTickers as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 10)
    : undefined;

  const analysis = await analyzeRipple(
    {
      headline,
      body: typeof body.body === "string" ? body.body || undefined : undefined,
      source: typeof body.source === "string" ? body.source || undefined : undefined,
      url: typeof body.url === "string" && body.url ? body.url : undefined,
      publishedAt: typeof body.publishedAt === "string" ? body.publishedAt || undefined : undefined,
      primaryTickers: tickers,
    },
    language,
  );
  res.json(analysis);
});

export default router;
