"use client";

import { useState, useRef, MouseEvent, useEffect } from "react";
import type { Node, Edge, Packet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RouterIcon } from "./icons";
import { Button } from "./ui/button";
import { Plus, Link2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InteractionMode = "none" | "add-node" | "add-edge";

interface NetworkCanvasProps {
  nodes: Node[];
  edges: Edge[];
  packets: Packet[];
  onNodeAdd: (x: number, y: number) => void;
  onEdgeAdd: (from: string, to: string) => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onEdgeToggle: (id: string) => void;
  isSimulating: boolean;
}

export function NetworkCanvas({
  nodes,
  edges,
  packets,
  onNodeAdd,
  onEdgeAdd,
  onNodeDrag,
  onEdgeToggle,
  isSimulating,
}: NetworkCanvasProps) {
  const [mode, setMode] = useState<InteractionMode>("none");
  const [edgeStartNode, setEdgeStartNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<{id: string, dx: number, dy: number} | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (mode === "add-node" && e.target === canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onNodeAdd(x, y);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (isSimulating) return;
    if (mode === "add-edge") {
      if (!edgeStartNode) {
        setEdgeStartNode(nodeId);
      } else {
        if (edgeStartNode !== nodeId) {
          onEdgeAdd(edgeStartNode, nodeId);
        }
        setEdgeStartNode(null);
        setMode("none");
      }
    }
  };
  
  const handleNodeMouseDown = (e: MouseEvent<HTMLDivElement>, nodeId: string) => {
    if(mode === "none" && !isSimulating && canvasRef.current) {
      const node = nodes.find(n => n.id === nodeId);
      if(!node) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setDraggingNode({ id: nodeId, dx: mouseX - node.x, dy: mouseY - node.y });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingNode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - draggingNode.dx;
      const y = e.clientY - rect.top - draggingNode.dy;
      onNodeDrag(draggingNode.id, x, y);
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };
  
  useEffect(() => {
    if (mode !== "add-edge") {
      setEdgeStartNode(null);
    }
  }, [mode]);


  return (
    <div className="relative w-full h-full bg-background rounded-lg border shadow-inner flex flex-col">
       <div className="p-2 border-b flex items-center justify-between bg-card rounded-t-lg">
        <p className="text-sm font-medium">Network Topology</p>
         <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={mode === 'add-node' ? 'secondary' : 'ghost'} size="icon" onClick={() => setMode(m => m === 'add-node' ? 'none' : 'add-node')} disabled={isSimulating}>
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Add Node (click on canvas)</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                 <Button variant={mode === 'add-edge' ? 'secondary' : 'ghost'} size="icon" onClick={() => setMode(m => m === 'add-edge' ? 'none' : 'add-edge')} disabled={isSimulating}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Add Edge (click two nodes)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div
        ref={canvasRef}
        className={cn(
          "flex-1 relative overflow-hidden",
          { "cursor-crosshair": mode === "add-node" },
          { "bg-primary/5": mode !== "none" }
        )}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            return (
              <g key={edge.id}>
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  className={cn(
                    "stroke-[3] transition-all",
                    edge.active ? "stroke-primary" : "stroke-destructive/50",
                    isSimulating && edge.active ? "opacity-75" : "opacity-100"
                  )}
                />
                 <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  className="stroke-[15] stroke-transparent pointer-events-auto cursor-pointer"
                  onClick={() => !isSimulating && onEdgeToggle(edge.id)}
                />
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className={cn(
              "absolute w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 select-none",
              "flex flex-col items-center justify-center rounded-full border-2",
              "bg-card transition-colors duration-300",
              isSimulating ? "cursor-not-allowed" : (mode === 'none' ? 'cursor-grab' : 'cursor-pointer'),
              edgeStartNode === node.id ? "border-accent ring-4 ring-accent/50" : "border-primary",
              draggingNode?.id === node.id ? "shadow-2xl scale-105 z-10 cursor-grabbing" : ""
            )}
            style={{ left: node.x, top: node.y }}
            onClick={() => handleNodeClick(node.id)}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            <RouterIcon className="w-6 h-6 text-primary" />
            <span className="text-xs font-bold font-code mt-1">{node.id}</span>
          </div>
        ))}

        {packets.map(packet => {
          if (packet.path.length < 2) return null;
          const start = packet.path[0];
          const end = packet.path[1];
          const x = start.x + (end.x - start.x) * packet.progress;
          const y = start.y + (end.y - start.y) * packet.progress;

          return (
            <div key={packet.id}
              className={cn("absolute w-3 h-3 rounded-full bg-accent z-20 transform -translate-x-1/2 -translate-y-1/2",
                "shadow-[0_0_8px_2px] shadow-accent/70")}
              style={{ left: x, top: y }}
            />
          );
        })}

      </div>
       <div className="p-2 border-t text-center bg-card rounded-b-lg">
          <p className="text-xs text-muted-foreground">
            {isSimulating ? "Simulation running... Pause to edit network." : 
              mode === 'none' ? 'Click buttons to add nodes/edges, or drag nodes to move.' :
              mode === 'add-node' ? 'Click on the canvas to add a new router node.' :
              'Click on two nodes to create an edge between them.'
            }
            {edgeStartNode && ` Selected node: ${edgeStartNode}. Click another node.`}
          </p>
        </div>
    </div>
  );
}
