import { db, savedAnalysesTable, and, desc, eq } from "@workspace/db";
import type { SaveAnalysisRequest } from "@workspace/api-zod";

export type SaveAnalysisInput = SaveAnalysisRequest;

export async function listSavedAnalyses(userId: string) {
  return db
    .select()
    .from(savedAnalysesTable)
    .where(eq(savedAnalysesTable.userId, userId))
    .orderBy(desc(savedAnalysesTable.createdAt));
}

export async function saveAnalysis(userId: string, input: SaveAnalysisInput) {
  const [row] = await db
    .insert(savedAnalysesTable)
    .values({
      userId,
      symbol: input.symbol,
      name: input.name,
      timeframe: input.timeframe,
      language: input.language,
      snapshot: input.snapshot,
    })
    .onConflictDoUpdate({
      target: [
        savedAnalysesTable.userId,
        savedAnalysesTable.symbol,
        savedAnalysesTable.timeframe,
        savedAnalysesTable.language,
      ],
      set: {
        name: input.name,
        snapshot: input.snapshot,
        createdAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function deleteSavedAnalysis(userId: string, id: number): Promise<boolean> {
  const deleted = await db
    .delete(savedAnalysesTable)
    .where(and(eq(savedAnalysesTable.id, id), eq(savedAnalysesTable.userId, userId)))
    .returning({ id: savedAnalysesTable.id });
  return deleted.length > 0;
}
