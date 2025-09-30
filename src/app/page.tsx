
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge, Packet, Algorithm } from "@/lib/types";
import { SimulationControls } from "@/components/simulation-controls";
import { NetworkCanvas } from "@/components/network-canvas";
import { ExplanationPanel } from "@/components/explanation-panel";
import { RoutingTableDisplay } from "@/components/routing-table-display";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

const INITIAL_NODES: Node[] = [
  { id: 'A', x: 150, y: 250, routingTable: {} },
  { id: 'B', x: 400, y: 150, routingTable: {} },
  { id: 'C', x: 400, y: 350, routingTable: {} },
  { id: 'D', x: 650, y: 250, routingTable: {} },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'A-B', from: 'A', to: 'B', cost: 1, active: true },
  { id: 'A-C', from: 'A', to: 'C', cost: 1, active: true },
  { id: 'B-D', from: 'B', to: 'D', cost: 1, active: true },
  { id: 'C-D', from: 'C', to: 'D', cost: 1, active: true },
];

const MAX_LOG_ENTRIES = 100;

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
  const convergenceCounter = useRef(0);
  const { toast } = useToast();

  const addLog = useCallback((newLog: string) => {
    setLog(prevLog => {
        const updatedLog = [...prevLog, newLog];
        if (updatedLog.length > MAX_LOG_ENTRIES) {
            return updatedLog.slice(updatedLog.length - MAX_LOG_ENTRIES);
        }
        return updatedLog;
    });
  }, []);


  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setIsSimulating(false);
    const initialNodes = JSON.parse(JSON.stringify(INITIAL_NODES));
    setNodes(initialNodes.map((n: Node) => ({...n, routingTable: { [n.id]: { destination: n.id, nextHop: n.id, cost: 0 }} })));
    setEdges(JSON.parse(JSON.stringify(INITIAL_EDGES)));
    setPackets([]);
    setLog([]);
    simulationStep.current = 0;
    convergenceCounter.current = 0;
  }, []);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);
  
  // Simulation Logic
  useEffect(() => {
    if (!isRunning) return;

    const runRipStep = () => {
      let somethingChangedThisStep = false;
      
      // Update nodes based on received packets
      setNodes(currentNodes => {
        const finishedPackets = packets.filter(p => p.progress >= 1 && p.type === 'rip');
        if (finishedPackets.length === 0) {
            // If no packets, check for convergence below
            return currentNodes;
        }

        let nodesChanged = false;
        const updatedNodes = JSON.parse(JSON.stringify(currentNodes));

        for (const packet of finishedPackets) {
            const receivingNode = updatedNodes.find((n: Node) => n.id === packet.to);
            if (!receivingNode) continue;
            
            const senderNodeId = packet.from;
            const linkCost = edges.find(e => ((e.from === senderNodeId && e.to === receivingNode.id) || (e.from === receivingNode.id && e.to === senderNodeId)) && e.active)?.cost ?? Infinity;
            
            if (linkCost === Infinity) continue;
            
            const senderTable = packet.data as { [key: string]: { destination: string; nextHop: string; cost: number } };
            let tableUpdated = false;

            for (const dest in senderTable) {
                const sentRoute = senderTable[dest];
                const newCost = sentRoute.cost + linkCost;

                if (newCost >= 16) continue;

                const existingRoute = receivingNode.routingTable[dest];

                if (!existingRoute || newCost < existingRoute.cost) {
                    receivingNode.routingTable[dest] = { destination: dest, nextHop: senderNodeId, cost: newCost };
                    tableUpdated = true;
                } else if (existingRoute.nextHop === senderNodeId && existingRoute.cost !== newCost) {
                     receivingNode.routingTable[dest] = { destination: dest, nextHop: senderNodeId, cost: newCost };
                     tableUpdated = true;
                }
            }
            if (tableUpdated) {
                addLog(`Router ${receivingNode.id}'s table updated by ${senderNodeId}.`);
                nodesChanged = true;
                somethingChangedThisStep = true;
            }
        }
        
        if(nodesChanged) return updatedNodes;
        return currentNodes;
      });

      // After processing packets, send out new ones
      setNodes(currentNodes => {
          const updatingNodeId = currentNodes[simulationStep.current % currentNodes.length]?.id;
          if (!updatingNodeId) return currentNodes;

          const fromNode = currentNodes.find(n => n.id === updatingNodeId);
          if (fromNode) {
              const neighbors = edges
                  .filter(e => e.active && (e.from === fromNode.id || e.to === fromNode.id))
                  .map(e => (e.from === fromNode.id ? e.to : e.from));

              if (neighbors.length > 0) {
                  addLog(`Router ${fromNode.id} sends routing update to neighbors: ${neighbors.join(', ')}.`);
                  somethingChangedThisStep = true;
                  const newPackets: Packet[] = neighbors.map(neighborId => {
                      const toNode = currentNodes.find(n => n.id === neighborId)!;
                      return {
                          id: `pkt-${Date.now()}-${Math.random()}`,
                          from: fromNode.id,
                          to: neighborId,
                          type: 'rip',
                          data: fromNode.routingTable,
                          progress: 0,
                          path: [{ x: fromNode.x, y: fromNode.y }, { x: toNode.x, y: toNode.y }]
                      };
                  });
                  setPackets(p => [...p, ...newPackets]);
              }
          }
          return currentNodes;
      });
      
      if (!somethingChangedThisStep) {
        convergenceCounter.current++;
      } else {
        convergenceCounter.current = 0;
      }
      
      // If no changes for a full round of nodes, assume convergence
      if (convergenceCounter.current >= nodes.length * 2) {
        addLog("Network has converged. Simulation paused.");
        setIsRunning(false);
      }
    };

    const interval = setInterval(() => {
      if(algorithm === 'rip') {
        runRipStep();
      } else {
        toast({ title: "Coming Soon!", description: "OSPF simulation is not yet implemented."});
        setIsRunning(false);
      }
      simulationStep.current++;
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isRunning, nodes, edges, speed, algorithm, packets, toast, addLog]);
  
  // Packet animation
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
        setPackets(currentPackets => {
            return currentPackets
                .map(p => ({ ...p, progress: p.progress + 0.01 * speed }))
                .filter(p => p.progress <= 1);
        });
        animationFrameId = requestAnimationFrame(animate);
    };

    if (isRunning) { // Animate only when simulation is running
        animationFrameId = requestAnimationFrame(animate);
    } else {
        setPackets([]); // Clear packets when paused
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [speed, isRunning]);


  const handleRunPause = () => {
    if (!isRunning && !isSimulating) {
        setIsSimulating(true);
        addLog("Simulation started with RIP algorithm.");
    }
    setIsRunning(r => !r);
    convergenceCounter.current = 0;
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
    const newNodeId = getNextNodeId();
    const newNode: Node = { id: newNodeId, x, y, routingTable: { [newNodeId]: { destination: newNodeId, nextHop: newNodeId, cost: 0 } } };
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
     convergenceCounter.current = 0;
     setEdges(prev => prev.map(e => {
       if (e.id === id) {
         const newEdge = { ...e, active: !e.active };
         if (!newEdge.active) {
            addLog(`Link ${id} was deactivated. Routing tables will be updated.`);
            // Set routes using this link to infinity(16) for relevant nodes
            setNodes(currentNodes => currentNodes.map(node => {
                const newTable = { ...node.routingTable };
                let updated = false;
                Object.keys(newTable).forEach(dest => {
                    if (newTable[dest].nextHop === newEdge.from || newTable[dest].nextHop === newEdge.to) {
                        const destinationNode = nodes.find(n => n.id === dest);
                        const edgeNodes = [newEdge.from, newEdge.to];
                        if(edgeNodes.includes(destinationNode?.id ?? '')) {
                           newTable[dest] = { ...newTable[dest], cost: 16 };
                           updated = true;
                        }
                    }
                });
                if(updated) {
                    addLog(`Router ${node.id} updated its table due to link deactivation.`);
                }
                return { ...node, routingTable: updated ? newTable : node.routingTable };
            }));
         } else {
           addLog(`Link ${id} was activated.`);
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
        <div className="grid md:grid-rows-[1fr_250px] lg:grid-rows-[1fr_300px] overflow-hidden gap-4 p-4">
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
