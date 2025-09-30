
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
  { id: 'A', x: 300, y: 250, routingTable: {} },
  { id: 'B', x: 500, y: 150, routingTable: {} },
  { id: 'C', x: 500, y: 350, routingTable: {} },
  { id: 'D', x: 700, y: 250, routingTable: {} },
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

  // Refs to hold the latest state for use in the simulation interval
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const packetsRef = useRef(packets);
  const logRef = useRef(log);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    packetsRef.current = packets;
  }, [packets]);

  useEffect(() => {
    logRef.current = log;
  }, [log]);


  const addLog = useCallback((newLog: string) => {
    const message = `[${new Date().toLocaleTimeString()}] ${newLog}`;
    setLog(prevLog => [message, ...prevLog.slice(0, MAX_LOG_ENTRIES - 1)]);
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
  
   const runRipStep = useCallback(() => {
    let somethingChangedInNetwork = false;
    let newLogs: string[] = [];

    // 1. Process finished packets and update tables
    const finishedPackets = packetsRef.current.filter(p => p.progress >= 1 && p.type === 'rip');

    if (finishedPackets.length > 0) {
      setNodes(currentNodes => {
        const updatedNodes = JSON.parse(JSON.stringify(currentNodes));
        let anyTableUpdated = false;

        for (const packet of finishedPackets) {
            const receivingNode = updatedNodes.find((n: Node) => n.id === packet.to);
            if (!receivingNode) continue;

            const senderNodeId = packet.from;
            const linkCost = edgesRef.current.find(e => ((e.from === senderNodeId && e.to === receivingNode.id) || (e.from === receivingNode.id && e.to === senderNodeId)) && e.active)?.cost ?? Infinity;
            if (linkCost === Infinity) continue;
            
            const senderTable = packet.data as RipRoutingTable;
            let tableUpdated = false;

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
                    } else if (existingRoute && existingRoute.nextHop === senderNodeId && existingRoute.cost !== newCost) {
                        const updatedCost = newCost >= 16 ? 16 : newCost;
                        if (existingRoute.cost !== updatedCost) {
                          receivingNode.routingTable[dest] = { ...existingRoute, cost: updatedCost };
                          tableUpdated = true;
                        }
                    }
                }
            }
            
            if (tableUpdated) {
                newLogs.push(`Router ${receivingNode.id}'s table updated by ${senderNodeId}.`);
                anyTableUpdated = true;
            }
        }

        if (anyTableUpdated) {
            somethingChangedInNetwork = true;
            return updatedNodes;
        } else {
            return currentNodes;
        }
      });
    }
    
    // Clear processed packets
    setPackets(currentPackets => currentPackets.filter(p => p.progress < 1));

    // 2. Create and send new packets based on the latest tables
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0) {
        const updatingNodeIndex = simulationStep.current % currentNodes.length;
        const fromNode = currentNodes[updatingNodeIndex];

        if (fromNode) {
            const neighbors = edgesRef.current
                .filter(e => e.active && (e.from === fromNode.id || e.to === fromNode.id))
                .map(e => (e.from === fromNode.id ? e.to : e.from));

            if (neighbors.length > 0) {
                newLogs.push(`Router ${fromNode.id} sends routing update to neighbors: ${neighbors.join(', ')}.`);
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
    }
    
    // Add all logs from this step
    if (newLogs.length > 0) {
      setLog(prevLog => [...newLogs.map(l => `[${new Date().toLocaleTimeString()}] ${l}`).reverse(), ...prevLog.slice(0, MAX_LOG_ENTRIES - newLogs.length)]);
    }

    // 3. Convergence check
    if (somethingChangedInNetwork) {
        convergenceCounter.current = 0;
    } else {
        convergenceCounter.current++;
    }

    const numNodes = nodesRef.current.length;
    if (numNodes > 0 && convergenceCounter.current >= numNodes * 2) {
        addLog("Network has converged. Simulation paused.");
        setIsRunning(false);
    }

    simulationStep.current++;
  }, [addLog]);


  // Simulation Main Loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if(algorithm === 'rip') {
        runRipStep();
      } else {
        toast({ title: "Coming Soon!", description: "OSPF simulation is not yet implemented."});
        setIsRunning(false);
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isRunning, speed, algorithm, runRipStep, toast]);
  
  // Packet animation
  useEffect(() => {
    if (!packets.length && !isRunning) return;
    let animationFrameId: number;
    const animate = () => {
        setPackets(currentPackets => 
            currentPackets
                .map(p => ({ ...p, progress: p.progress + 0.01 * speed }))
        );
        animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [packets, speed, isRunning]);


  const handleRunPause = () => {
    if (!isRunning && !isSimulating) {
        addLog("Simulation started with RIP algorithm.");
        setIsSimulating(true);
    }
    setIsRunning(r => {
      if(!r) {
        addLog("Simulation resumed.");
      } else {
        addLog("Simulation paused.");
      }
      return !r;
    });
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

         if (!newEdge.active) {
            setNodes(currentNodes => {
                const updatedNodes = JSON.parse(JSON.stringify(currentNodes));
                let invalidatedRoute = false;
                updatedNodes.forEach((node: Node) => {
                    Object.keys(node.routingTable).forEach(dest => {
                        const route = node.routingTable[dest];
                        if (route.nextHop === toggledEdge.from || route.nextHop === toggledEdge.to || dest === toggledEdge.from || dest === toggledEdge.to) {
                           if ( (route.nextHop === toggledEdge.to && node.id === toggledEdge.from) || (route.nextHop === toggledEdge.from && node.id === toggledEdge.to) ){
                                node.routingTable[dest].cost = 16;
                                invalidatedRoute = true;
                           }
                        }
                    });
                });
                if (invalidatedRoute) {
                  addLog(`Routes via ${toggledEdge.from}-${toggledEdge.to} invalidated.`);
                }
                return updatedNodes;
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

    