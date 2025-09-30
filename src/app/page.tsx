"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge, Packet, Algorithm, RipRoutingTable } from "@/lib/types";
import { SimulationControls } from "@/components/simulation-controls";
import { NetworkCanvas } from "@/components/network-canvas";
import { ExplanationPanel } from "@/components/explanation-panel";
import { RoutingTableDisplay } from "@/components/routing-table-display";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

const INITIAL_NODES: Node[] = [
  { id: 'A', x: 150, y: 200, routingTable: [] },
  { id: 'B', x: 400, y: 100, routingTable: [] },
  { id: 'C', x: 400, y: 300, routingTable: [] },
  { id: 'D', x: 650, y: 200, routingTable: [] },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'A-B', from: 'A', to: 'B', cost: 1, active: true },
  { id: 'A-C', from: 'A', to: 'C', cost: 1, active: true },
  { id: 'B-D', from: 'B', to: 'D', cost: 1, active: true },
  { id: 'C-D', from: 'C', to: 'D', cost: 1, active: true },
];

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [algorithm, setAlgorithm] = useState<Algorithm>("rip");
  const [speed, setSpeed] = useState(2);
  const [isRunning, setIsRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const simulationStep = useRef(0);
  const { toast } = useToast();

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setIsSimulating(false);
    // Deep copy to avoid state mutations
    setNodes(JSON.parse(JSON.stringify(INITIAL_NODES)));
    setEdges(JSON.parse(JSON.stringify(INITIAL_EDGES)));
    setPackets([]);
    setLog([]);
    simulationStep.current = 0;
  }, []);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);
  
  // Simulation Logic
  useEffect(() => {
    if (!isRunning) return;

    const runRipStep = () => {
      const step = simulationStep.current;
      const updatingNode = nodes[step % nodes.length];
      
      if (!updatingNode) return;
      
      // Initialize node's own route
      if (updatingNode.routingTable.length === 0 || !updatingNode.routingTable.find(r => r.destination === updatingNode.id)) {
        setNodes(prevNodes => prevNodes.map(n => {
          if (n.id === updatingNode.id) {
            const newTable = [{ destination: n.id, nextHop: n.id, cost: 0 }];
            return { ...n, routingTable: newTable };
          }
          return n;
        }));
        setLog(l => [...l.slice(-99), `Router ${updatingNode.id} initialized its routing table.`]);
        return;
      }
      
      const neighbors = edges
        .filter(e => e.active && (e.from === updatingNode.id || e.to === updatingNode.id))
        .map(e => (e.from === updatingNode.id ? e.to : e.from));

      if(neighbors.length > 0) {
        setLog(l => [...l.slice(-99), `Router ${updatingNode.id} sends updates to neighbors: ${neighbors.join(', ')}.`]);

        const newPackets: Packet[] = neighbors.map(neighborId => {
          const fromNode = nodes.find(n => n.id === updatingNode.id)!;
          const toNode = nodes.find(n => n.id === neighborId)!;
          return {
            id: `pkt-${Date.now()}-${Math.random()}`,
            from: updatingNode.id,
            to: neighborId,
            type: 'rip',
            data: updatingNode.routingTable,
            progress: 0,
            path: [{x: fromNode.x, y: fromNode.y}, {x: toNode.x, y: toNode.y}]
          };
        });
        setPackets(p => [...p, ...newPackets]);
      }

      // Process received packets
      setNodes(prevNodes => {
        let nodesChanged = false;
        const updatedNodes = prevNodes.map(n => ({ ...n, routingTable: [...n.routingTable] }));

        packets.filter(p => p.type === 'rip').forEach(packet => {
          const receivingNode = updatedNodes.find(n => n.id === packet.to);
          if (!receivingNode) return;

          let tableUpdated = false;
          const senderTable = packet.data as RipRoutingTable;
          
          senderTable.forEach(sentRoute => {
            const newCost = sentRoute.cost + 1; // Cost to sender is 1
            if (newCost >= 16) return; // "Infinity" in RIP

            const existingRoute = receivingNode.routingTable.find(r => r.destination === sentRoute.destination);

            if (!existingRoute) {
              receivingNode.routingTable.push({ destination: sentRoute.destination, nextHop: packet.from, cost: newCost });
              tableUpdated = true;
            } else if (newCost < existingRoute.cost || existingRoute.nextHop === packet.from) {
                if (newCost !== existingRoute.cost || existingRoute.nextHop !== packet.from) {
                    existingRoute.cost = newCost;
                    existingRoute.nextHop = packet.from;
                    tableUpdated = true;
                }
            }
          });

          if (tableUpdated) {
            setLog(l => [...l.slice(-99), `Router ${receivingNode.id} updated its table from ${packet.from}.`]);
            nodesChanged = true;
          }
        });
        
        return nodesChanged ? updatedNodes : prevNodes;
      });
    };

    const interval = setInterval(() => {
      if(algorithm === 'rip') {
        runRipStep();
      } else {
        toast({ title: "Coming Soon!", description: "OSPF simulation is not yet implemented."});
        setIsRunning(false);
      }
      simulationStep.current++;
    }, 2000 / speed);

    return () => clearInterval(interval);
  }, [isRunning, nodes, edges, speed, algorithm, packets, toast]);
  
  // Packet animation
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setPackets(currentPackets => 
        currentPackets
          .map(p => ({ ...p, progress: p.progress + 0.01 * speed }))
          .filter(p => p.progress < 1)
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    if (packets.length > 0 && isRunning) {
      animationFrameId = requestAnimationFrame(animate);
    } else if (packets.length > 0 && !isRunning) {
        // Clear packets when paused
        setPackets([]);
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [packets, speed, isRunning]);


  const handleRunPause = () => {
    if (!isSimulating) {
        setIsSimulating(true);
    }
    setIsRunning(r => !r);
  };
  
  const getNextNodeId = useCallback(() => {
    const existingIds = new Set(nodes.map(n => n.id));
    for (let i = 0; i < 26; i++) {
        const char = String.fromCharCode(65 + i);
        if (!existingIds.has(char)) return char;
    }
    return `N${nodes.length + 1}`;
  }, [nodes]);

  const handleNodeAdd = (x: number, y: number) => {
    if (isSimulating) return;
    const newNode: Node = { id: getNextNodeId(), x, y, routingTable: [] };
    setNodes(prev => [...prev, newNode]);
  };

  const handleEdgeAdd = (from: string, to: string) => {
    if (isSimulating) return;
    if (edges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from))) {
      toast({
        variant: "destructive",
        title: "Edge already exists",
        description: `An edge between ${from} and ${to} already exists.`,
      });
      return;
    }
    const newEdge: Edge = { id: `${from}-${to}`, from, to, cost: 1, active: true };
    setEdges(prev => [...prev, newEdge]);
  };

  const handleNodeDrag = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));
  };
  
  const handleEdgeToggle = (id: string) => {
     if (isSimulating) return;
     setEdges(prev => prev.map(e => {
       if (e.id === id) {
         const wasActive = e.active;
         const newEdge = { ...e, active: !e.active };
         if (wasActive) { // if link is deactivated
           // In a real scenario, this would trigger updates. We simplify here.
           // Set cost to infinity for related routes
           setNodes(nodes => nodes.map(node => ({
             ...node,
             routingTable: node.routingTable.map(route => {
               if (route.nextHop === newEdge.from || route.nextHop === newEdge.to) {
                 // This is a simplification; poison reverse would be more accurate
               }
               return route;
             })
           })))
           setLog(l => [...l.slice(-99), `Link ${id} was deactivated. Convergence will begin.`]);
         } else {
           setLog(l => [...l.slice(-99), `Link ${id} was activated.`]);
         }
         return newEdge;
       }
       return e;
     }));
  }
  
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="flex items-center px-4 h-16 border-b shrink-0 z-10 bg-card">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold font-headline tracking-tight">EvolvedRouteSim</h1>
        </div>
      </header>
      <main className="flex-1 grid md:grid-cols-[400px_1fr] lg:grid-cols-[450px_1fr] overflow-hidden">
        <aside className="flex flex-col gap-4 p-4 border-r overflow-y-auto">
          <SimulationControls
            algorithm={algorithm}
            setAlgorithm={setAlgorithm}
            speed={speed}
            setSpeed={setSpeed}
            isRunning={isRunning}
            onRunPause={handleRunPause}
            onReset={resetSimulation}
            isSimulating={isSimulating}
          />
          <RoutingTableDisplay nodes={nodes} isSimulating={isSimulating} />
        </aside>
        <div className="grid md:grid-rows-[1fr_300px] lg:grid-rows-[1fr_350px] overflow-hidden gap-4 p-4">
            <NetworkCanvas
              nodes={nodes}
              edges={edges}
              packets={packets}
              onNodeAdd={handleNodeAdd}
              onEdgeAdd={handleEdgeAdd}
              onNodeDrag={handleNodeDrag}
              onEdgeToggle={handleEdgeToggle}
              isSimulating={isSimulating}
            />
          <ExplanationPanel algorithm={algorithm} log={log} />
        </div>
      </main>
    </div>
  );
}
