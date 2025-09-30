
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
  { id: 'A', x: 200, y: 250, routingTable: {} },
  { id: 'B', x: 450, y: 150, routingTable: {} },
  { id: 'C', x: 450, y: 350, routingTable: {} },
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

  const addLog = useCallback((newLog: string) => {
    setLog(prevLog => [...prevLog.slice(-MAX_LOG_ENTRIES + 1), newLog]);
  }, []);

  const resetSimulation = useCallback(() => {
    setIsRunning(false);
    setIsSimulating(false);
    setNodes(JSON.parse(JSON.stringify(INITIAL_NODES.map(n => ({...n, routingTable: {}})))));
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
      const step = simulationStep.current;
      const updatingNodeId = nodes[step % nodes.length]?.id;
      if (!updatingNodeId) return;

      let hasChanged = false;

      // 1. Initialize self-route if it doesn't exist
      setNodes(currentNodes => {
        const nodeToUpdate = currentNodes.find(n => n.id === updatingNodeId);
        if (nodeToUpdate && (!nodeToUpdate.routingTable[updatingNodeId] || nodeToUpdate.routingTable[updatingNodeId].cost !== 0)) {
           hasChanged = true;
           return currentNodes.map(n => {
            if (n.id === updatingNodeId) {
              const newTable = { ...n.routingTable, [n.id]: { destination: n.id, nextHop: n.id, cost: 0 }};
              addLog(`Router ${n.id} initialized its routing table.`);
              return { ...n, routingTable: newTable };
            }
            return n;
          });
        }
        return currentNodes;
      });

      // 2. Send routing table to neighbors
      const fromNode = nodes.find(n => n.id === updatingNodeId);
      if (fromNode) {
        const neighbors = edges
          .filter(e => e.active && (e.from === fromNode.id || e.to === fromNode.id))
          .map(e => (e.from === fromNode.id ? e.to : e.from));

        if (neighbors.length > 0) {
          addLog(`Router ${fromNode.id} sends routing update to neighbors: ${neighbors.join(', ')}.`);
          const newPackets: Packet[] = neighbors.map(neighborId => {
            const toNode = nodes.find(n => n.id === neighborId)!;
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

      // 3. Process received packets and update tables (Bellman-Ford logic)
      setNodes(currentNodes => {
        let nodesChangedInStep = false;
        const updatedNodes = JSON.parse(JSON.stringify(currentNodes));

        const activePackets = packets.filter(p => p.type === 'rip' && p.progress < 1);

        activePackets.forEach(packet => {
          const receivingNode = updatedNodes.find((n: Node) => n.id === packet.to);
          if (!receivingNode) return;

          const senderNodeId = packet.from;
          const linkCost = edges.find(e => (e.from === senderNodeId && e.to === receivingNode.id) || (e.from === receivingNode.id && e.to === senderNodeId))?.cost ?? 1;
          const senderTable = packet.data as { [key: string]: { destination: string; nextHop: string; cost: number } };

          let tableUpdated = false;

          // Update based on sender's table
          for (const dest in senderTable) {
            const sentRoute = senderTable[dest];
            const newCost = sentRoute.cost + linkCost;

            if (newCost >= 16) continue;

            const existingRoute = receivingNode.routingTable[dest];

            if (!existingRoute || newCost < existingRoute.cost) {
              receivingNode.routingTable[dest] = { destination: dest, nextHop: senderNodeId, cost: newCost };
              tableUpdated = true;
            } else if (existingRoute.nextHop === senderNodeId && newCost !== existingRoute.cost) {
              // If the path is through the sender, update the cost regardless
              receivingNode.routingTable[dest] = { ...existingRoute, cost: newCost };
              tableUpdated = true;
            }
          }
          
          if (tableUpdated) {
            addLog(`Router ${receivingNode.id}'s table updated based on info from ${senderNodeId}.`);
            nodesChangedInStep = true;
            hasChanged = true;
          }
        });

        if (nodesChangedInStep) {
          return updatedNodes;
        }
        return currentNodes;
      });
      
      if (!hasChanged) {
        convergenceCounter.current++;
      } else {
        convergenceCounter.current = 0; // Reset if any change occurred
      }

      // If no changes for a full round of nodes, assume convergence
      if (convergenceCounter.current >= nodes.length) {
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
    }, 2000 / speed);

    return () => clearInterval(interval);
  }, [isRunning, nodes, edges, speed, algorithm, packets, toast, addLog]);
  
  // Packet animation
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
        setPackets(currentPackets => {
            const newPackets = currentPackets
                .map(p => ({ ...p, progress: p.progress + 0.01 * speed }))
                .filter(p => p.progress < 1);

            // If a packet finishes, process its effect
            const finishedPackets = currentPackets.filter(p => p.progress >= 1);
            if (finishedPackets.length > 0) {
              // The logic to update tables is now inside the main simulation loop
              // This just clears the packet from animation
            }
            return newPackets;
        });
        animationFrameId = requestAnimationFrame(animate);
    };

    if (packets.length > 0 || isRunning) {
        animationFrameId = requestAnimationFrame(animate);
    }
    
    return () => cancelAnimationFrame(animationFrameId);
  }, [packets, speed, isRunning]);


  const handleRunPause = () => {
    if (!isSimulating) {
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
    const newNode: Node = { id: getNextNodeId(), x, y, routingTable: {} };
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
         const edgeNodes = [newEdge.from, newEdge.to];
         
         if (!newEdge.active) { // if link is deactivated
           addLog(`Link ${id} was deactivated. Convergence will begin.`);
           // Set routes through this link to infinity (16)
           setNodes(currentNodes => currentNodes.map(node => {
              const newRoutingTable = { ...node.routingTable };
              let tableChanged = false;
              Object.keys(newRoutingTable).forEach(dest => {
                const route = newRoutingTable[dest];
                // If route goes through one of the edge nodes to reach the other
                if ((route.nextHop === edgeNodes[0] && dest === edgeNodes[1]) || (route.nextHop === edgeNodes[1] && dest === edgeNodes[0])) {
                   newRoutingTable[dest] = { ...route, cost: 16 };
                   tableChanged = true;
                }
                // Poison reverse: If a node sends updates about a destination to its own next-hop for that destination
                if(newRoutingTable[dest].nextHop === edgeNodes[0] || newRoutingTable[dest].nextHop === edgeNodes[1]){
                    // This is more complex, for now we will just rely on count to infinity
                }
              });
              return { ...node, routingTable: newRoutingTable };
           }));
         } else {
           addLog(`Link ${id} was activated.`);
           // When link is re-activated, convergence will naturally fix the tables.
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

    