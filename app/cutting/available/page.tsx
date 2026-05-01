"use client";

import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

type CuttingStockSummary = {
  totalLots: number;
  totalCurrentKg: number;
  totalReceivedKg: number;
};

type CuttingBatch = {
  _id: string;
  fabricType: string;
  receivedKg?: number;
  convertedKg?: number;
  remainingKg?: number;
  status?: "Available Cutting" | "Cutting Completed";
};

type BatchDetails = CuttingBatch & {
  transferHistory?: { quantityKg: number; transferDate: string }[];
  conversionHistory?: { inputKg: number; outputPieces: number; date: string }[];
};

export default function AvailableCuttingPage() {
  useAuthGuard({ requireAuth: true });
  const hydrated = useAuthStore((state) => state.hydrated);
  const [summary, setSummary] = useState<CuttingStockSummary>({
    totalLots: 0,
    totalCurrentKg: 0,
    totalReceivedKg: 0,
  });
  const [batches, setBatches] = useState<CuttingBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<BatchDetails | null>(null);
  const [activeBatchId, setActiveBatchId] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completeForm, setCompleteForm] = useState({
    convertedKg: "",
    outputPieces: "",
    completionDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof AxiosError) {
      const msg = (error.response?.data as { message?: string } | undefined)?.message;
      if (msg) return msg;
    }
    return fallback;
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryRes, batchesRes] = await Promise.all([
        api.get<{ data: CuttingStockSummary }>("/cutting/stock/summary"),
        api.get<{ data: CuttingBatch[] }>("/cutting/batches/history"),
      ]);
      setSummary(summaryRes.data.data || { totalLots: 0, totalCurrentKg: 0, totalReceivedKg: 0 });
      setBatches((batchesRes.data.data || []).filter((item) => (item.remainingKg || 0) > 0));
    } catch {
      setError("Failed to load available cutting data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    const run = async () => {
      await loadData();
    };
    void run();
  }, [hydrated]);

  const openDetails = async (batch: CuttingBatch) => {
    setShowDetails(true);
    setActiveBatch(batch);
    try {
      const res = await api.get<{
        data: {
          batch: BatchDetails;
        };
      }>(`/cutting/batches/${batch._id}`);
      setActiveBatch(res.data.data?.batch || batch);
    } catch {
      setActiveBatch(batch);
    }
  };

  const openComplete = (batch: CuttingBatch) => {
    setActiveBatchId(batch._id);
    setActiveBatch(batch);
    setCompleteForm({
      convertedKg: "",
      outputPieces: "",
      completionDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setShowComplete(true);
  };

  const openDelete = (batch: CuttingBatch) => {
    setActiveBatchId(batch._id);
    setActiveBatch(batch);
    setShowDelete(true);
  };

  const submitComplete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeBatchId) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/cutting/batches/${activeBatchId}/complete-cutting`, {
        convertedKg: Number(completeForm.convertedKg),
        outputPieces: Number(completeForm.outputPieces),
        completionDate: completeForm.completionDate,
        notes: completeForm.notes || undefined,
      });
      setShowComplete(false);
      await loadData();
    } catch (error: unknown) {
      setError(
        getApiErrorMessage(
          error,
          "Completion failed. Conversion kg may exceed available stock."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitDelete = async () => {
    if (!activeBatchId) return;
    setDeleteSubmitting(true);
    setError(null);
    try {
      await api.delete(`/cutting/batches/${activeBatchId}`);
      setShowDelete(false);
      setShowDetails(false);
      setActiveBatch(null);
      await loadData();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Failed to delete cutting batch."));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (!hydrated) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Available Cutting</h1>
          <p className="text-sm text-muted-foreground">Current cutting stock ready for conversion.</p>
        </header>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Rows</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.totalLots}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Current Stock (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold text-emerald-700">{summary.totalCurrentKg.toFixed(2)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Received (kg)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.totalReceivedKg.toFixed(2)}</CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Available Cutting Table</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Fabric Type</th>
                      <th className="py-2 pr-4">Total Received Kg</th>
                      <th className="py-2 pr-4">Converted Kg</th>
                      <th className="py-2 pr-4">Remaining Kg</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr
                        key={batch._id}
                        className="cursor-pointer border-b hover:bg-muted/40"
                        onClick={() => openDetails(batch)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            void openDetails(batch);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="py-2 pr-4">{batch.fabricType}</td>
                        <td className="py-2 pr-4">{(batch.receivedKg || 0).toFixed(2)} kg</td>
                        <td className="py-2 pr-4">{(batch.convertedKg || 0).toFixed(2)} kg</td>
                        <td className="py-2 pr-4">{(batch.remainingKg || 0).toFixed(2)} kg</td>
                        <td className="py-2 pr-4"><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Available Cutting</span></td>
                        <td className="py-2 pr-0">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => openDetails(batch)}>Details</Button>
                            <Button size="sm" onClick={() => openComplete(batch)}>Complete Cutting</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => openDelete(batch)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {batches.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No available cutting stock.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Cutting to Pieces</DialogTitle>
            <DialogDescription>Convert part of available stock into piece output.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitComplete}>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              Available: {(activeBatch?.remainingKg || 0).toFixed(2)} kg
            </div>
            <div className="space-y-2"><Label>Conversion Kg</Label><Input type="number" min="0.01" step="0.01" value={completeForm.convertedKg} onChange={(e) => setCompleteForm((p) => ({ ...p, convertedKg: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Output Pieces</Label><Input type="number" min="1" step="1" value={completeForm.outputPieces} onChange={(e) => setCompleteForm((p) => ({ ...p, outputPieces: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Completion Date</Label><Input type="date" value={completeForm.completionDate} onChange={(e) => setCompleteForm((p) => ({ ...p, completionDate: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Notes (optional)</Label><Input value={completeForm.notes} onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowComplete(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Completing..." : "Complete"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cutting Item Details</DialogTitle>
            <DialogDescription>Transfer and conversion history for this fabric item.</DialogDescription>
          </DialogHeader>
          {activeBatch && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Fabric:</span> {activeBatch.fabricType}</p>
                <p><span className="font-medium">Total Received:</span> {(activeBatch.receivedKg || 0).toFixed(2)} kg</p>
                <p><span className="font-medium">Converted:</span> {(activeBatch.convertedKg || 0).toFixed(2)} kg</p>
                <p><span className="font-medium">Remaining:</span> {(activeBatch.remainingKg || 0).toFixed(2)} kg</p>
              </div>
              <div>
                <p className="mb-2 font-medium">Transfer History</p>
                <div className="max-h-40 space-y-2 overflow-auto rounded border p-2">
                  {(activeBatch.transferHistory || []).length === 0 && <p className="text-muted-foreground">No transfer history.</p>}
                  {(activeBatch.transferHistory || []).map((item, idx) => (
                    <div key={`${item.transferDate}-${idx}`} className="rounded border bg-muted/20 px-2 py-1">
                      {new Date(item.transferDate).toLocaleDateString()} | {Number(item.quantityKg || 0).toFixed(2)} kg transferred
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 font-medium">Conversion History</p>
                <div className="max-h-40 space-y-2 overflow-auto rounded border p-2">
                  {(activeBatch.conversionHistory || []).length === 0 && <p className="text-muted-foreground">No conversions yet.</p>}
                  {(activeBatch.conversionHistory || []).map((item, idx) => (
                    <div key={`${item.date}-${idx}`} className="rounded border bg-muted/20 px-2 py-1">
                      {new Date(item.date).toLocaleDateString()} | {Number(item.inputKg || 0).toFixed(2)} kg {"->"} {Number(item.outputPieces || 0).toFixed(2)} pcs
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cutting Batch?</DialogTitle>
            <DialogDescription>
              Deleting this cutting batch will rollback conversions and restore inventory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={submitDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
