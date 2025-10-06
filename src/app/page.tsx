
/**
 * EvoRoute - Interactive Network Routing Protocol Simulator
 * 
 * Implements RIP (RFC 2453) and OSPF (RFC 2328) routing protocols with
 * explicit data structures for educational purposes.
 * 
 * Key Design Decisions:
 * - RIP: Hop count metric (cost=1 per link), infinity=16
 * - OSPF: Bandwidth-based costs using 10 Gbps reference bandwidth
 *         Formula: cost = 10000 / bandwidth_mbps
 *         (RFC 2328 allows configurable reference bandwidth)
 * - Data Structures: Adjacency List Graph, MinHeap Priority Queue, Hash Tables
 * - Visualization: Real-time routing table updates, counting to infinity detection
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Node, Edge, Packet, Algorithm, RipRoutingTable, OspfRoutingTable, LinkStateAdvertisement, OspfNodeData, ShortestPathNode } from "@/lib/types";
import { MinHeap, NetworkGraph } from "@/lib/data-structures";
import { SimulationControls } from "@/components/simulation-controls";
import { NetworkCanvas } from "@/components/network-canvas";
import { ExplanationPanel } from "@/components/explanation-panel";
import { RoutingTableDisplay } from "@/components/routing-table-display";
import { BandwidthDialog } from "@/components/bandwidth-dialog";
import { Logo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

const INITIAL_NODES: Node[] = [
  { id: 'A', x: 300, y: 250, routingTable: {} },
  { id: 'B', x: 500, y: 150, routingTable: {} },
  { id: 'C', x: 500, y: 350, routingTable: {} },
  { id: 'D', x: 700, y: 250, routingTable: {} },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'A-B', from: 'A', to: 'B', cost: 1, bandwidth: 100, active: true },
  { id: 'A-C', from: 'A', to: 'C', cost: 1, bandwidth: 100, active: true },
  { id: 'B-D', from: 'B', to: 'D', cost: 1, bandwidth: 100, active: true },
  { id: 'C-D', from: 'C', to: 'D', cost: 1, bandwidth: 100, active: true },
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
  const [bandwidthDialogOpen, setBandwidthDialogOpen] = useState(false);
  const [pendingEdge, setPendingEdge] = useState<{from: string, to: string} | null>(null);
  
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
    const initialEdges = JSON.parse(JSON.stringify(INITIAL_EDGES));
    
    // CRITICAL: Recalculate edge costs based on current algorithm
    // RIP: Always cost=1 (hop count)
    // OSPF: cost = 10000 / bandwidth (reference bandwidth / link bandwidth)
    const edgesWithCorrectCosts = initialEdges.map((e: Edge) => ({
      ...e,
      cost: algorithm === 'ospf' ? Math.round(10000 / (e.bandwidth || 100)) : 1
    }));
    
    if (algorithm === 'rip') {
      // RIP: Initialize with self + direct neighbors
      const nodesWithRip = initialNodes.map((n: Node) => {
        const routingTable: any = {};
        // Route to self
        routingTable[n.id] = { destination: n.id, nextHop: n.id, cost: 0 };
        
        // Routes to direct neighbors (cost = 1 hop)
        const neighbors = edgesWithCorrectCosts
          .filter((e: Edge) => e.active && (e.from === n.id || e.to === n.id))
          .map((e: Edge) => e.from === n.id ? e.to : e.from);
        
        neighbors.forEach((neighborId: string) => {
          routingTable[neighborId] = {
            destination: neighborId,
            nextHop: neighborId,
            cost: 1
          };
        });
        
        return { ...n, routingTable };
      });
      setNodes(nodesWithRip);
    } else if (algorithm === 'ospf') {
      // OSPF: Initialize with self, will flood LSAs to learn topology
      setNodes(initialNodes.map((n: Node) => ({
        ...n,
        routingTable: { [n.id]: { destination: n.id, nextHop: n.id, cost: 0, interface: n.id } },
        ospfData: {
          routerId: n.id,
          area: "0.0.0.0",
          linkStateDatabase: {},
          neighbors: [],
          shortestPathTree: []
        }
      })));
    }
    
    setEdges(edgesWithCorrectCosts);
    setPackets([]);
    setLog([]);
    simulationStep.current = 0;
    convergenceCounter.current = 0;
    
    addLog(`Simulation reset with ${algorithm.toUpperCase()} algorithm.`);
  }, [algorithm, addLog]);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Update edge costs when algorithm changes (for user-created edges)
  useEffect(() => {
    if (edges.length > 0 && !isSimulating) {
      setEdges(prevEdges => 
        prevEdges.map(e => ({
          ...e,
          cost: algorithm === 'ospf' ? Math.round(10000 / (e.bandwidth || 100)) : 1
        }))
      );
    }
  }, [algorithm, isSimulating]); // Only run when algorithm changes, not on every edge change
  
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
                            receivingNode.routingTable[dest] = { 
                              destination: dest, 
                              nextHop: senderNodeId, 
                              cost: newCost,
                              isInfinite: false 
                            };
                            tableUpdated = true;
                            // Enhanced logging for Bellman-Ford update
                            if (!existingRoute) {
                              newLogs.push(`✅ RIP (Bellman-Ford): Router ${receivingNode.id} learned new route to ${dest} via ${senderNodeId} (cost: ${newCost} hops). Distance vector updated.`);
                            } else {
                              newLogs.push(`🔄 RIP (Bellman-Ford): Router ${receivingNode.id} found better path to ${dest} via ${senderNodeId} (old: ${existingRoute.cost} hops → new: ${newCost} hops). Accepting lower cost route.`);
                            }
                        }
                    } else if (existingRoute && existingRoute.nextHop === senderNodeId && existingRoute.cost !== newCost) {
                        const updatedCost = newCost >= 16 ? 16 : newCost;
                        if (existingRoute.cost !== updatedCost) {
                          receivingNode.routingTable[dest] = { 
                            ...existingRoute, 
                            cost: updatedCost,
                            isInfinite: updatedCost >= 16 
                          };
                          tableUpdated = true;
                          // Enhanced logging for counting to infinity
                          if (updatedCost >= 16) {
                            newLogs.push(`⚠️ COUNTING TO INFINITY DETECTED: Router ${receivingNode.id} route to ${dest} reached infinity (${updatedCost} ≥ 16 hops). This occurs when link fails and routers continuously increment hop count. Route marked unreachable.`);
                          } else if (updatedCost > existingRoute.cost) {
                            newLogs.push(`⚠️ RIP UPDATE: Router ${receivingNode.id} route to ${dest} cost increased: ${existingRoute.cost} → ${updatedCost} hops. Next hop ${senderNodeId} reported higher cost (possible link degradation or topology change).`);
                          }
                        }
                    }
                }
            }
            
            if (tableUpdated) {
                newLogs.push(`📊 RIP DISTANCE VECTOR EXCHANGE: Router ${receivingNode.id} processed routing table from neighbor ${senderNodeId}. Distance vector algorithm completed update cycle.`);
                receivingNode.isUpdating = true; // Visual indicator
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

  // OSPF Implementation
  const runOspfStep = useCallback(() => {
    let somethingChangedInNetwork = false;
    let newLogs: string[] = [];

    // 1. Process finished LSA packets
    const finishedPackets = packetsRef.current.filter(p => p.progress >= 1 && p.type === 'ospf-lsa');

    if (finishedPackets.length > 0) {
      setNodes(currentNodes => {
        const updatedNodes = JSON.parse(JSON.stringify(currentNodes));
        let anyLSDBUpdated = false;

        for (const packet of finishedPackets) {
          const receivingNode = updatedNodes.find((n: Node) => n.id === packet.to);
          if (!receivingNode || !receivingNode.ospfData) continue;

          const lsa = packet.data as LinkStateAdvertisement;
          const existingLSA = receivingNode.ospfData.linkStateDatabase[lsa.routerId];
          
          // Install LSA if it's new or newer
          if (!existingLSA || lsa.sequenceNumber > existingLSA.sequenceNumber) {
            receivingNode.ospfData.linkStateDatabase[lsa.routerId] = lsa;
            const linkCount = lsa.links.length;
            newLogs.push(`📡 OSPF LSA FLOODING: Router ${receivingNode.id} received Link State Advertisement from ${lsa.routerId} (seq: ${lsa.sequenceNumber}, ${linkCount} links). LSDB updated with topology information.`);
            anyLSDBUpdated = true;
          }
        }

        if (anyLSDBUpdated) {
          somethingChangedInNetwork = true;
          // Recalculate routing tables using Dijkstra
          updatedNodes.forEach((node: Node) => {
            if (node.ospfData) {
              const oldTable = JSON.stringify(node.routingTable);
              const newRoutingTable = calculateOspfRoutes(node, updatedNodes, edgesRef.current);
              node.routingTable = newRoutingTable;
              
              // Check if table actually changed
              if (oldTable !== JSON.stringify(newRoutingTable)) {
                node.isUpdating = true;
                const routeCount = Object.keys(newRoutingTable).length;
                newLogs.push(`🧮 OSPF DIJKSTRA SPF: Router ${node.id} detected LSDB change. Running Dijkstra's Shortest Path First algorithm on link-state graph. Computed ${routeCount} routes based on bandwidth costs (cost = 10,000 / bandwidth_mbps).`);
              }
            }
          });
        }

        return anyLSDBUpdated ? updatedNodes : currentNodes;
      });
    }

    // Clear processed packets
    setPackets(currentPackets => currentPackets.filter(p => p.progress < 1));

    // 2. Generate and flood LSAs
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0) {
      const updatingNodeIndex = simulationStep.current % currentNodes.length;
      const fromNode = currentNodes[updatingNodeIndex];

      if (fromNode && fromNode.ospfData) {
        // Create LSA for this node
        const neighbors = edgesRef.current
          .filter(e => e.active && (e.from === fromNode.id || e.to === fromNode.id))
          .map(e => ({
            to: e.from === fromNode.id ? e.to : e.from,
            cost: e.cost,
            active: e.active
          }));

        const lsa: LinkStateAdvertisement = {
          routerId: fromNode.id,
          sequenceNumber: (fromNode.ospfData.linkStateDatabase[fromNode.id]?.sequenceNumber || 0) + 1,
          age: 0,
          links: neighbors,
          timestamp: Date.now()
        };

        // Update own LSDB
        fromNode.ospfData.linkStateDatabase[fromNode.id] = lsa;

        // Flood to all neighbors
        const neighborIds = neighbors.map(n => n.to);
        if (neighborIds.length > 0) {
          const totalCost = neighbors.reduce((sum, n) => sum + n.cost, 0);
          newLogs.push(`📤 OSPF LSA ORIGINATION: Router ${fromNode.id} originates Link State Advertisement (seq: ${lsa.sequenceNumber}) and floods to neighbors: ${neighborIds.join(', ')}. Advertising ${neighbors.length} links with total cost ${totalCost}. This forms the distributed link-state database.`);
          const newPackets: Packet[] = neighborIds.map(neighborId => {
            const toNode = currentNodes.find(n => n.id === neighborId)!;
            return {
              id: `lsa-${Date.now()}-${Math.random()}`,
              from: fromNode.id,
              to: neighborId,
              type: 'ospf-lsa',
              data: lsa,
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
      addLog("OSPF network has converged. Simulation paused.");
      setIsRunning(false);
    }

    simulationStep.current++;
  }, [addLog]);

  // Dijkstra's algorithm for OSPF route calculation using MinHeap Priority Queue
  // Time Complexity: O((V + E) log V) - Much better than O(V²) linear search
  const calculateOspfRoutes = useCallback((node: Node, allNodes: Node[], allEdges: Edge[]): OspfRoutingTable => {
    const distances: { [nodeId: string]: number } = {};
    const previous: { [nodeId: string]: string | undefined } = {};
    const visited = new Set<string>();
    
    // Initialize MinHeap Priority Queue (KEY DATA STRUCTURE)
    const priorityQueue = new MinHeap();

    // Initialize distances and add all nodes to priority queue
    allNodes.forEach(n => {
      const dist = n.id === node.id ? 0 : Infinity;
      distances[n.id] = dist;
      priorityQueue.insert(n.id, dist);
    });

    // Dijkstra's algorithm using Priority Queue
    while (!priorityQueue.isEmpty()) {
      // Extract node with minimum distance - O(log V)
      const current = priorityQueue.extractMin();
      if (!current || distances[current.id] === Infinity) break;

      visited.add(current.id);

      // Check all neighbors
      const currentEdges = allEdges.filter(e => 
        e.active && (e.from === current.id || e.to === current.id)
      );

      for (const edge of currentEdges) {
        const neighbor = edge.from === current.id ? edge.to : edge.from;
        if (visited.has(neighbor)) continue;

        // Relaxation step
        const alt = distances[current.id] + edge.cost;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = current.id;
          // Decrease key in priority queue - O(log V)
          priorityQueue.decreaseKey(neighbor, alt);
        }
      }
    }

    // Build routing table from shortest path tree
    const routingTable: OspfRoutingTable = {};
    
    // Add route to self
    routingTable[node.id] = {
      destination: node.id,
      nextHop: node.id,
      cost: 0,
      interface: node.id
    };

    // Add routes to other nodes
    for (const targetId of Object.keys(distances)) {
      if (targetId === node.id || distances[targetId] === Infinity) continue;

      // Find next hop by tracing back through shortest path tree
      let nextHop = targetId;
      while (previous[nextHop] && previous[nextHop] !== node.id) {
        nextHop = previous[nextHop]!;
      }

      routingTable[targetId] = {
        destination: targetId,
        nextHop: nextHop,
        cost: distances[targetId],
        interface: nextHop
      };
    }

    return routingTable;
  }, []);


  // Simulation Main Loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if(algorithm === 'rip') {
        runRipStep();
      } else if(algorithm === 'ospf') {
        runOspfStep();
      }
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [isRunning, speed, algorithm, runRipStep, runOspfStep]);
  
  // Packet animation
  useEffect(() => {
    if (!packets.length && !isRunning) return;
    let animationFrameId: number;
    const animate = () => {
        setPackets(currentPackets => 
            currentPackets
                .map(p => ({ ...p, progress: p.progress + 0.01 * speed }))
                .filter(p => p.progress < 1.1) // Allow to slightly overshoot to be processed, then remove
        );
        animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [packets.length, speed, isRunning]);

  // Clear isUpdating flags after visual feedback duration
  useEffect(() => {
    const nodesWithUpdates = nodes.filter(n => n.isUpdating);
    if (nodesWithUpdates.length === 0) return;

    const timeout = setTimeout(() => {
      setNodes(prevNodes => 
        prevNodes.map(n => n.isUpdating ? { ...n, isUpdating: false } : n)
      );
    }, 800);

    return () => clearTimeout(timeout);
  }, [nodes]);


  const handleRunPause = () => {
    if (!isRunning && !isSimulating) {
        addLog(`Simulation started with ${algorithm.toUpperCase()} algorithm.`);
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
    const newNode: Node = { 
      id: newNodeId, 
      x, 
      y, 
      routingTable: { [newNodeId]: { destination: newNodeId, nextHop: newNodeId, cost: 0 } }
    };
    
    if (algorithm === 'ospf') {
      newNode.ospfData = {
        routerId: newNodeId,
        area: "0.0.0.0",
        linkStateDatabase: {},
        neighbors: [],
        shortestPathTree: []
      };
    }
    
    setNodes(prev => [...prev, newNode]);
  };

  const handleEdgeAddRequest = (from: string, to: string) => {
    if (isSimulating) return;
    if (edges.some(e => (e.from === from && e.to === to) || (e.from === to && e.to === from))) {
      toast({
        variant: "destructive",
        title: "Edge already exists",
        description: `An edge between ${from} and ${to} already exists.`,
      });
      return;
    }
    setPendingEdge({ from, to });
    setBandwidthDialogOpen(true);
  };

  const handleEdgeAdd = (from: string, to: string, bandwidth: number) => {
    if (isSimulating) return;
    
    // Calculate cost based on algorithm
    // RIP: Always 1 (hop count metric - RFC 2453)
    // OSPF: Reference bandwidth / link bandwidth (RFC 2328)
    //   We use 10,000 Mbps (10 Gbps) reference instead of standard 100 Mbps
    //   This is configurable and better demonstrates cost differences in modern networks
    //   Formula: cost = 10000 / bandwidth_mbps
    //   Example: 100 Mbps → cost=100, 1000 Mbps → cost=10
    const cost = algorithm === 'ospf' ? Math.round(10000 / bandwidth) : 1;
    
    const newEdge: Edge = { 
      id: `${from}-${to}`, 
      from, 
      to, 
      cost, 
      bandwidth,
      active: true 
    };
    setEdges(prev => [...prev, newEdge]);
    addLog(`Link created: ${from}-${to} (Bandwidth: ${bandwidth} Mbps, Cost: ${cost})`);
    
    // For RIP: Immediately update routing tables with direct neighbor info
    if (algorithm === 'rip') {
      setNodes(prev => prev.map(node => {
        if (node.id === from) {
          return {
            ...node,
            routingTable: {
              ...node.routingTable,
              [to]: { destination: to, nextHop: to, cost: 1 }
            }
          };
        } else if (node.id === to) {
          return {
            ...node,
            routingTable: {
              ...node.routingTable,
              [from]: { destination: from, nextHop: from, cost: 1 }
            }
          };
        }
        return node;
      }));
    }
  };

  const handleBandwidthConfirm = (bandwidth: number) => {
    if (pendingEdge) {
      handleEdgeAdd(pendingEdge.from, pendingEdge.to, bandwidth);
      setPendingEdge(null);
    }
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
            if (algorithm === 'rip') {
              // RIP-specific route invalidation
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
            } else if (algorithm === 'ospf') {
              // OSPF will handle this through LSA updates automatically
              addLog(`OSPF will recalculate routes due to link state change.`);
            }
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
          <RoutingTableDisplay nodes={nodes} isSimulating={isSimulating} algorithm={algorithm} />
        </aside>
        <div className="grid md:grid-rows-[1fr_250px] lg:grid-rows-[1fr_300px] overflow-hidden gap-4 p-4">
            <NetworkCanvas
              nodes={nodes}
              edges={edges}
              packets={packets}
              onNodeAdd={handleNodeAdd}
              onEdgeAdd={handleEdgeAdd}
              onEdgeAddRequest={handleEdgeAddRequest}
              onNodeDrag={handleNodeDrag}
              onEdgeToggle={handleEdgeToggle}
              isSimulating={isSimulating}
              algorithm={algorithm}
            />
          <ExplanationPanel algorithm={algorithm} log={log} />
        </div>
      </main>
      
      <BandwidthDialog
        isOpen={bandwidthDialogOpen}
        onClose={() => {
          setBandwidthDialogOpen(false);
          setPendingEdge(null);
        }}
        onConfirm={handleBandwidthConfirm}
        fromNode={pendingEdge?.from || ''}
        toNode={pendingEdge?.to || ''}
        algorithm={algorithm}
      />
    </div>
  );
}
