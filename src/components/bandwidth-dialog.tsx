"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BandwidthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bandwidth: number) => void;
  fromNode: string;
  toNode: string;
  algorithm: "rip" | "ospf";
}

export function BandwidthDialog({
  isOpen,
  onClose,
  onConfirm,
  fromNode,
  toNode,
  algorithm,
}: BandwidthDialogProps) {
  const [bandwidth, setBandwidth] = useState<string>("100");
  const [error, setError] = useState<string>("");

  const handleConfirm = () => {
    const bw = parseFloat(bandwidth);
    
    if (isNaN(bw) || bw <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    if (bw > 10000) {
      setError("Bandwidth should be reasonable (≤ 10,000 Mbps)");
      return;
    }

    onConfirm(bw);
    setBandwidth("100");
    setError("");
    onClose();
  };

  const handleCancel = () => {
    setBandwidth("100");
    setError("");
    onClose();
  };

  const calculateCost = () => {
    const bw = parseFloat(bandwidth);
    if (isNaN(bw) || bw <= 0) return "-";
    
    if (algorithm === "ospf") {
      return Math.round(10000 / bw);
    }
    return "1 (hop count)";
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Link: {fromNode} ↔ {toNode}</DialogTitle>
          <DialogDescription>
            Set the bandwidth for this link. {
              algorithm === "ospf" 
                ? "OSPF will calculate cost as 10,000 / bandwidth." 
                : "RIP uses hop count (cost = 1) regardless of bandwidth."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bandwidth" className="text-right">
              Bandwidth
            </Label>
            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <Input
                  id="bandwidth"
                  type="number"
                  value={bandwidth}
                  onChange={(e) => {
                    setBandwidth(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  placeholder="100"
                  min="1"
                  max="10000"
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">Mbps</span>
              </div>
              {error && <p className="text-sm text-destructive mt-1">{error}</p>}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-muted-foreground">
              Calculated Cost
            </Label>
            <div className="col-span-3">
              <p className="text-sm font-mono font-bold">{calculateCost()}</p>
            </div>
          </div>

          {algorithm === "ospf" && (
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Common values:</strong><br />
                • 10 Gbps = 1 cost<br />
                • 1 Gbps = 10 cost<br />
                • 100 Mbps = 100 cost (default)<br />
                • 10 Mbps = 1000 cost
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Create Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
