"use client";

import { useState, useRef, MouseEvent, useEffect } from "react";
import type { Node, Edge, Packet } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RouterIcon } from "./icons";
import { Button } from "./ui/button";
import { Plus, Link2, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InteractionMode = "none" | "add-node" | "add-edge" | "delete-node";

interface NetworkCanvasProps {
  nodes: Node[];
  edges: Edge[];
  packets: Packet[];
  onNodeAdd: (x: number, y: number) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeAdd: (from: string, to: string, bandwidth: number) => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onEdgeToggle: (id: string) => void;
  onEdgeAddRequest: (from: string, to: string) => void;
  isSimulating: boolean;
  algorithm: 'rip' | 'ospf';
}

export function NetworkCanvas({
  nodes,
  edges,
  packets,
  onNodeAdd,
  onNodeDelete,
  onEdgeAdd,
  onNodeDrag,
  onEdgeToggle,
  onEdgeAddRequest,
  isSimulating,
  algorithm,
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
    if (mode === "delete-node") {
      onNodeDelete(nodeId);
      setMode("none");
      return;
    }
    
    if (isSimulating) return;
    if (mode === "add-edge") {
      if (!edgeStartNode) {
        setEdgeStartNode(nodeId);
      } else {
        if (edgeStartNode !== nodeId) {
          onEdgeAddRequest(edgeStartNode, nodeId);
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={mode === 'delete-node' ? 'secondary' : 'ghost'} size="icon" onClick={() => setMode(m => m === 'delete-node' ? 'none' : 'delete-node')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete Node (click on node)</p></TooltipContent>
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

            // Calculate midpoint for cost label
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2;
            
            // Calculate offset perpendicular to edge
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const offsetX = (-dy / length) * 15; // Perpendicular offset
            const offsetY = (dx / length) * 15;

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
                  onClick={() => onEdgeToggle(edge.id)}
                />
                {/* Edge cost/bandwidth label */}
                <g transform={`translate(${midX + offsetX}, ${midY + offsetY})`}>
                  <rect
                    x="-20"
                    y="-10"
                    width="40"
                    height="20"
                    rx="4"
                    className={cn(
                      "fill-card/95 transition-all",
                      edge.active ? "stroke-primary" : "stroke-destructive/50"
                    )}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    className={cn(
                      "text-[10px] font-mono font-bold pointer-events-none select-none",
                      edge.active ? "fill-primary" : "fill-destructive"
                    )}
                  >
                    {algorithm === 'ospf' ? `${edge.cost}` : '1'}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          // Check if node has counting to infinity problem
          const hasInfiniteRoute = Object.values(node.routingTable).some(
            (route: any) => route.cost >= 16
          );
          
          return (
          <div
            key={node.id}
            className={cn(
              "absolute w-16 h-16 transform -translate-x-1/2 -translate-y-1/2 select-none",
              "flex flex-col items-center justify-center rounded-full border-2",
              "bg-card transition-all duration-300",
              isSimulating ? "cursor-not-allowed" : (
                mode === 'none' ? 'cursor-grab' : 
                mode === 'delete-node' ? 'cursor-pointer hover:cursor-crosshair' :
                'cursor-pointer'
              ),
              edgeStartNode === node.id ? "border-accent ring-4 ring-accent/50" : "border-primary",
              draggingNode?.id === node.id ? "shadow-2xl scale-105 z-10 cursor-grabbing" : "",
              // Visual indicators for algorithm states
              node.isUpdating && "animate-pulse border-accent shadow-lg shadow-accent/50",
              hasInfiniteRoute && algorithm === 'rip' && "border-destructive ring-2 ring-destructive/30",
              node.isProcessing && algorithm === 'ospf' && "border-muted ring-2 ring-muted/50",
              node.isVisited && algorithm === 'ospf' && "border-primary ring-2 ring-primary/30"
            )}
            style={{ left: node.x, top: node.y }}
            onClick={() => handleNodeClick(node.id)}
            onDoubleClick={() => onNodeDelete(node.id)}
            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
          >
            <RouterIcon className={cn(
              "w-6 h-6 transition-colors",
              hasInfiniteRoute && algorithm === 'rip' ? "text-destructive" : "text-primary"
            )} />
            <span className="text-xs font-bold font-code mt-1">{node.id}</span>
          </div>
        );
        })}

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
            {isSimulating ? "Simulation running... Pause to edit network. Double-click nodes to delete." : 
              mode === 'none' ? 'Click buttons to add nodes/edges, drag to move, double-click to delete nodes.' :
              mode === 'add-node' ? 'Click on the canvas to add a new router node.' :
              mode === 'add-edge' ? 'Click on two nodes to create an edge between them.' :
              mode === 'delete-node' ? 'Click on a node to delete it and all connected edges.' :
              'Unknown mode'
            }
            {edgeStartNode && ` Selected node: ${edgeStartNode}. Click another node.`}
          </p>
        </div>
    </div>
  );
}
