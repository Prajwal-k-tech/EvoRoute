"use client";

import { Play, Pause, RotateCw } from "lucide-react";
import type { Algorithm } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";

interface SimulationControlsProps {
  algorithm: Algorithm;
  setAlgorithm: (alg: Algorithm) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  isRunning: boolean;
  onRunPause: () => void;
  onReset: () => void;
  isSimulating: boolean;
}

export function SimulationControls({
  algorithm,
  setAlgorithm,
  speed,
  setSpeed,
  isRunning,
  onRunPause,
  onReset,
  isSimulating,
}: SimulationControlsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Controls</CardTitle>
        <CardDescription>Configure and run the simulation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="algorithm-select">Routing Algorithm</Label>
          <Select
            value={algorithm}
            onValueChange={(value) => setAlgorithm(value as Algorithm)}
            disabled={isSimulating}
          >
            <SelectTrigger id="algorithm-select" className="w-full">
              <SelectValue placeholder="Select an algorithm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rip">RIP (Distance Vector)</SelectItem>
              <SelectItem value="ospf">OSPF (Link State)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed-slider">Simulation Speed</Label>
            <span className="text-sm text-muted-foreground">{speed}x</span>
          </div>
          <Slider
            id="speed-slider"
            min={1}
            max={10}
            step={1}
            value={[speed]}
            onValueChange={(value) => setSpeed(value[0])}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onRunPause} className="w-full" variant="default">
                  {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isRunning ? "Pause" : "Run"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start or pause the simulation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onReset} className="w-full" variant="outline">
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset the network and simulation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
