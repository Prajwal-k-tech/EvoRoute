
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
  { id: 'A', x: 250, y: 350, routingTable: {} },
  { id: 'B', x: 500, y: 250, routingTable: {} },
  { id: 'C', x: 500, y: 450, routingTable: {} },
  { id: 'D', x: 750, y: 350, routingTable: {} },
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
  const logRef = useRef(log);
  
  useEffect(() => {
    logRef.current = log;
  }, [log]);

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
        let somethingChangedInAnyNode = false;

        // 1. Create and send packets from one node per step
        setNodes(currentNodes => {
            const updatingNodeIndex = simulationStep.current % currentNodes.length;
            const fromNode = currentNodes[updatingNodeIndex];

            if (fromNode) {
                const neighbors = edges
                    .filter(e => e.active && (e.from === fromNode.id || e.to === fromNode.id))
                    .map(e => (e.from === fromNode.id ? e.to : e.from));

                if (neighbors.length > 0) {
                    if (logRef.current.length === 0 || !logRef.current[logRef.current.length - 1].startsWith(`Router ${fromNode.id} sends`)) {
                        addLog(`Router ${fromNode.id} sends routing update to neighbors: ${neighbors.join(', ')}.`);
                    }

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
                    setPackets(p => [...p.filter(packet => packet.progress < 1), ...newPackets]);
                }
            }
            return currentNodes;
        });

        // 2. Process received packets and update tables
        setNodes(currentNodes => {
            const finishedPackets = packets.filter(p => p.progress >= 1 && p.type === 'rip');
            if (finishedPackets.length === 0) {
                convergenceCounter.current++;
                return currentNodes;
            }

            const updatedNodes = JSON.parse(JSON.stringify(currentNodes));
            let anyTableUpdated = false;

            for (const packet of finishedPackets) {
                const receivingNode = updatedNodes.find((n: Node) => n.id === packet.to);
                if (!receivingNode) continue;

                const senderNodeId = packet.from;
                const linkCost = edges.find(e => ((e.from === senderNodeId && e.to === receivingNode.id) || (e.from === receivingNode.id && e.to === senderNodeId)) && e.active)?.cost ?? Infinity;
                if (linkCost === Infinity) continue;
                
                const senderTable = packet.data as RipRoutingTable;
                let tableUpdated = false;

                // Also consider all known destinations from the receiver's own table
                const allDestinations = new Set([...Object.keys(senderTable), ...Object.keys(receivingNode.routingTable)]);

                for (const dest of allDestinations) {
                    const sentRoute = senderTable[dest];
                    const existingRoute = receivingNode.routingTable[dest];
                    
                    if (sentRoute) {
                        const newCost = sentRoute.cost + linkCost;

                        if (!existingRoute || newCost < existingRoute.cost) {
                            if (newCost < 16) {
                                receivingNode.routingTable[dest] = { destination: dest, nextHop: senderNodeId, cost: newCost };
                                tableUpdated = true;
                            }
                        } else if (existingRoute.nextHop === senderNodeId && existingRoute.cost !== newCost) {
                            receivingNode.routingTable[dest] = { destination: dest, nextHop: senderNodeId, cost: newCost >= 16 ? 16 : newCost };
                            tableUpdated = true;
                        }
                    }
                }
                
                if (tableUpdated) {
                    addLog(`Router ${receivingNode.id}'s table updated by ${senderNodeId}.`);
                    anyTableUpdated = true;
                    somethingChangedInAnyNode = true;
                }
            }

            if(anyTableUpdated) {
                convergenceCounter.current = 0; // Reset counter if any change occurred
                return updatedNodes;
            } else {
                convergenceCounter.current++;
                return currentNodes;
            }
        });

        // Clear processed packets
        setPackets(currentPackets => currentPackets.filter(p => p.progress < 1));

        if (somethingChangedInAnyNode) {
            convergenceCounter.current = 0;
        } else {
            convergenceCounter.current++;
        }

        // Check for convergence
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
                .filter(p => p.progress <= 1.1); // Keep them a bit longer to ensure processing
        });
        animationFrameId = requestAnimationFrame(animate);
    };

    if (packets.length > 0) {
        animationFrameId = requestAnimationFrame(animate);
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [packets, speed]);


  const handleRunPause = () => {
    if (!isRunning && !isSimulating) {
        addLog("Simulation started with RIP algorithm.");
        setIsSimulating(true);
    }
    setIsRunning(r => !r);
    if(isRunning) { // if it was running, now it's paused
      addLog("Simulation paused.");
    } else { // if it was paused, now it's running
      addLog("Simulation resumed.");
    }
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
    setPackets([]);
  };
  
  const handleEdgeToggle = (id: string) => {
     if (isSimulating) return;
     convergenceCounter.current = 0;
     setEdges(prev => prev.map(e => {
       if (e.id === id) {
         const newEdge = { ...e, active: !e.active };
         const toggledEdge = edges.find(edge => edge.id === id)!;
         
         addLog(`Link ${toggledEdge.from}-${toggledEdge.to} was ${newEdge.active ? 'activated' : 'deactivated'}.`);

         // When a link goes down, routers should update affected routes
         if (!newEdge.active) {
            setNodes(currentNodes => {
                const updatedNodes = JSON.parse(JSON.stringify(currentNodes));
                let changeOccurred = false;
                updatedNodes.forEach((node: Node) => {
                    let nodeTableUpdated = false;
                    Object.values(node.routingTable).forEach(route => {
                        // A route is affected if it uses one of the disconnected nodes as a next hop
                        // and the destination is now potentially unreachable via that hop
                        const isNextHopDisconnected = route.nextHop === toggledEdge.from || route.nextHop === toggledEdge.to;
                        const isRouteThroughEdge = (node.id === toggledEdge.from && route.nextHop === toggledEdge.to) || (node.id === toggledEdge.to && route.nextHop === toggledEdge.from);

                        if(isRouteThroughEdge){
                           node.routingTable[route.destination] = { ...route, cost: 16 };
                           nodeTableUpdated = true;
                        } else if(isNextHopDisconnected){
                            // More complex poison reverse / split horizon logic could go here.
                            // For now, we just invalidate routes that directly used the link.
                            // The regular RIP updates will handle recalculating alternative paths.
                        }
                    });
                    if (nodeTableUpdated) {
                        addLog(`Router ${node.id} invalidates routes due to link deactivation.`);
                        changeOccurred = true;
                    }
                });
                return changeOccurred ? updatedNodes : currentNodes;
            });
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
