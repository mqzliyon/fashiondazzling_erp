"use client";

import { useEffect, useState } from "react";
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

type CompletedRow = {
  fabricType: string;
  totalConvertedKg: number;
  totalPieces: number;
  totalSentPieces?: number;
  availablePieces?: number;
  averageYield: number;
  conversionCount: number;
  status: string;
  conversionHistory: {
    convertedKg: number;
    outputPieces: number;
    yieldRatio: number;
    completionDate: string;
  }[];
};

type LotOption = {
  _id: string;
  lotNumber: string;
  outputPieces: number;
};

export default function CompleteCuttingPage() {
  useAuthGuard({ requireAuth: true });
  const hydrated = useAuthStore((state) => state.hydrated);
  const [rows, setRows] = useState<CompletedRow[]>([]);
  const [active, setActive] = useState<CompletedRow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showSendLot, setShowSendLot] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [sendSubmitting, setSendSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotOptions, setLotOptions] = useState<LotOption[]>([]);
  const [sendForm, setSendForm] = useState({
    pieceLotId: "",
    pieces: "",
    option: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [completedRes, lotsRes] = await Promise.all([
        api.get<{ data: CompletedRow[] }>("/cutting/completed/summary"),
        api.get<{ data: LotOption[] }>("/piece-lots"),
      ]);
      setRows(completedRes.data.data || []);
      setLotOptions(lotsRes.data.data || []);
    } catch {
      setError("Failed to load completed cutting.");
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

  if (!hydrated) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold">Complete Cutting</h1>
          <p className="text-sm text-muted-foreground">
            One aggregated row per fabric type from conversion history.
          </p>
        </header>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Card>
          <CardHeader><CardTitle>Completed Cutting Table</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4">Fabric Type</th>
                      <th className="py-2 pr-4">Total Converted Kg</th>
                      <th className="py-2 pr-4">Total Pieces</th>
                      <th className="py-2 pr-4">Total Sent PCS</th>
                      <th className="py-2 pr-4">Available Balance PCS</th>
                      <th className="py-2 pr-4">Average Yield (pcs/kg)</th>
                      <th className="py-2 pr-4">Conversion Count</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-0">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.fabricType}
                        className="cursor-pointer border-b hover:bg-muted/40"
                        onClick={() => {
                          setActive(row);
                          setShowDetails(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActive(row);
                            setShowDetails(true);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="py-2 pr-4">{row.fabricType}</td>
                        <td className="py-2 pr-4">{row.totalConvertedKg.toFixed(2)} kg</td>
                        <td className="py-2 pr-4">{row.totalPieces.toFixed(2)}</td>
                        <td className="py-2 pr-4">{Number(row.totalSentPieces || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">{Number(row.availablePieces || 0).toFixed(2)}</td>
                        <td className="py-2 pr-4">{row.averageYield.toFixed(2)}</td>
                        <td className="py-2 pr-4">{row.conversionCount}</td>
                        <td className="py-2 pr-4">
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 pr-0">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              onClick={() => {
                                setActive(row);
                                setSendForm({ pieceLotId: "", pieces: "", option: "" });
                                setShowSendLot(true);
                              }}
                            >
                              Send Lot
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActive(row);
                                setShowDetails(true);
                              }}
                            >
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setActive(row);
                                setShowDelete(true);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No completed cutting records.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Cutting Details</DialogTitle>
            <DialogDescription>Fabric-wise aggregated completed conversions.</DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p><span className="font-medium">Fabric:</span> {active.fabricType}</p>
                <p><span className="font-medium">Total Converted:</span> {active.totalConvertedKg.toFixed(2)} kg</p>
                <p><span className="font-medium">Total Pieces:</span> {active.totalPieces.toFixed(2)}</p>
                <p><span className="font-medium">Average Yield:</span> {active.averageYield.toFixed(2)} pcs/kg</p>
              </div>
              <div>
                <p className="mb-2 font-medium">Conversion Timeline</p>
                <div className="max-h-56 space-y-2 overflow-auto rounded border p-2">
                  {active.conversionHistory.length === 0 && (
                    <p className="text-muted-foreground">No conversion timeline.</p>
                  )}
                  {active.conversionHistory.map((item, idx) => (
                    <div key={`${item.completionDate}-${idx}`} className="rounded border bg-muted/20 px-2 py-1">
                      {new Date(item.completionDate).toLocaleDateString()} | {item.convertedKg.toFixed(2)} kg {"->"} {item.outputPieces.toFixed(2)} pcs ({item.yieldRatio.toFixed(2)} pcs/kg)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSendLot} onOpenChange={setShowSendLot}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Lot</DialogTitle>
            <DialogDescription>
              Select lot, enter pcs and option. Available quantity is from completed cutting.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!active?.fabricType) return;
              setSendSubmitting(true);
              setError(null);
              try {
                await api.post(
                  `/cutting/completed/${encodeURIComponent(active.fabricType)}/send-to-lot`,
                  {
                    pieceLotId: sendForm.pieceLotId,
                    pieces: Number(sendForm.pieces),
                    option: sendForm.option || undefined,
                  }
                );
                setShowSendLot(false);
                setActive(null);
                await loadData();
              } catch {
                setError("Failed to send lot. Check selected lot and available quantity.");
              } finally {
                setSendSubmitting(false);
              }
            }}
          >
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
              Available Quantity: {Number(active?.availablePieces || 0).toFixed(2)} pcs
            </div>
            <div className="space-y-2">
              <Label>Lot Name</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={sendForm.pieceLotId}
                onChange={(e) => setSendForm((p) => ({ ...p, pieceLotId: e.target.value }))}
                required
              >
                <option value="">Select lot</option>
                {lotOptions.map((lot) => (
                  <option key={lot._id} value={lot._id}>
                    {lot.lotNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>PCS</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={sendForm.pieces}
                onChange={(e) => setSendForm((p) => ({ ...p, pieces: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Option</Label>
              <Input
                value={sendForm.option}
                onChange={(e) => setSendForm((p) => ({ ...p, option: e.target.value }))}
                placeholder="Option"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSendLot(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendSubmitting}>
                {sendSubmitting ? "Sending..." : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Complete Cutting Item?</DialogTitle>
            <DialogDescription>
              Deleting will rollback conversions and restore inventory for this fabric item.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSubmitting || !active?.fabricType}
              onClick={async () => {
                if (!active?.fabricType) return;
                setDeleteSubmitting(true);
                setError(null);
                try {
                  await api.delete(
                    `/cutting/completed/by-fabric-type/${encodeURIComponent(active.fabricType)}`
                  );
                  setShowDelete(false);
                  setShowDetails(false);
                  setActive(null);
                  await loadData();
                } catch {
                  setError("Failed to delete complete cutting item.");
                } finally {
                  setDeleteSubmitting(false);
                }
              }}
            >
              {deleteSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
