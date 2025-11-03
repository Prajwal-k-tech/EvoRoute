
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
import type { Node, Edge, Packet, Algorithm, RipRoute, RipRoutingTable, OspfRoutingTable, LinkStateAdvertisement, OspfNodeData, ShortestPathNode } from "@/lib/types";
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

  // Initialize the network on mount
  useEffect(() => {
    const initialNodes = JSON.parse(JSON.stringify(INITIAL_NODES));
    const initialEdges = JSON.parse(JSON.stringify(INITIAL_EDGES));
    setNodes(initialNodes);
    setEdges(initialEdges);
    addLog('Network initialized. Click Run to start simulation.');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addLog = useCallback((newLog: string) => {
    const message = `[${new Date().toLocaleTimeString()}] ${newLog}`;
    setLog(prevLog => [message, ...prevLog.slice(0, MAX_LOG_ENTRIES - 1)]);
  }, []);


  const resetSimulation = useCallback(() => {
    // First, stop all simulation activities
    setIsRunning(false);
    setIsSimulating(false);
    
    // Clear all simulation state immediately
    setPackets([]);
    simulationStep.current = 0;
    convergenceCounter.current = 0;
    
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
    setLog([]);
    
    addLog(`Simulation reset with ${algorithm.toUpperCase()} algorithm.`);
  }, [algorithm, addLog]);

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
  }, [algorithm, isSimulating]);
  
   const runRipStep = useCallback(() => {
    let somethingChangedInNetwork = false;
    let newLogs: string[] = [];

    newLogs.push('');
    newLogs.push(`╔═══════════════════════════════════════════════════════╗`);
    newLogs.push(`║  ITERATION ${simulationStep.current} - Bellman-Ford Distance Vector`);
    newLogs.push(`╚═══════════════════════════════════════════════════════╝`);

    // PHASE 1: Display current routing tables
    newLogs.push('');
    newLogs.push('[CURRENT ROUTING TABLES]');
    nodesRef.current.forEach(node => {
      newLogs.push(`  Router ${node.id}:`);
      const routes = Object.values(node.routingTable);
      routes.forEach((route: RipRoute) => {
        if (route.destination === node.id) {
          newLogs.push(`     ${route.destination}: SELF (cost 0)`);
        } else {
          const costDisplay = route.cost >= 16 ? 'INF (unreachable)' : route.cost.toString();
          newLogs.push(`     ${route.destination}: via ${route.nextHop}, cost ${costDisplay}`);
        }
      });
    });

    // PHASE 2: Process finished packets and update tables
    const finishedPackets = packetsRef.current.filter(p => p.progress >= 1 && p.type === 'rip');

    if (finishedPackets.length > 0) {
      newLogs.push('');
      newLogs.push(`[PROCESSING ${finishedPackets.length} INCOMING UPDATE(S)]`);
      
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
            const updates: string[] = [];

            newLogs.push(`  Router ${receivingNode.id} ← from ${senderNodeId} (link cost: ${linkCost}):`);

            const allDestinations = new Set([...Object.keys(senderTable), ...Object.keys(receivingNode.routingTable)]);

            for (const dest of allDestinations) {
                const sentRoute = senderTable[dest];
                const existingRoute = receivingNode.routingTable[dest];
                
                if (sentRoute && dest !== receivingNode.id) {
                    const newCost = sentRoute.cost + linkCost;
                    const advCost = sentRoute.cost >= 16 ? 'INF' : sentRoute.cost;

                    // Case 1: New route or better cost
                    if (!existingRoute || newCost < existingRoute.cost) {
                        if (newCost < 16) {
                            receivingNode.routingTable[dest] = { 
                              destination: dest, 
                              nextHop: senderNodeId, 
                              cost: newCost,
                              isInfinite: false 
                            };
                            tableUpdated = true;
                            if (!existingRoute) {
                              updates.push(`     [NEW] ${dest} via ${senderNodeId}, cost ${newCost} (${senderNodeId} advertised ${advCost})`);
                            } else {
                              const oldC = existingRoute.cost >= 16 ? 'INF' : existingRoute.cost;
                              updates.push(`     [BETTER] ${dest} now ${newCost} via ${senderNodeId} (was ${oldC} via ${existingRoute.nextHop})`);
                            }
                        }
                    } 
                    // Case 2: Same next-hop updates (must accept even if worse - RFC 2453)
                    else if (existingRoute && existingRoute.nextHop === senderNodeId && existingRoute.cost !== newCost) {
                        const updatedCost = newCost >= 16 ? 16 : newCost;
                        if (existingRoute.cost !== updatedCost) {
                          receivingNode.routingTable[dest] = { 
                            ...existingRoute, 
                            cost: updatedCost,
                            isInfinite: updatedCost >= 16 
                          };
                          tableUpdated = true;
                          
                          if (updatedCost >= 16) {
                            updates.push(`     [UNREACHABLE] ${dest} now INF (${senderNodeId} advertised INF)`);
                          } else if (updatedCost > existingRoute.cost) {
                            updates.push(`     [COST INCREASE] ${dest} cost ${existingRoute.cost} -> ${updatedCost} (counting to infinity)`);
                          } else {
                            updates.push(`     [COST DECREASE] ${dest} cost ${existingRoute.cost} -> ${updatedCost}`);
                          }
                        }
                    }
                }
            }
            
            if (updates.length > 0) {
              updates.forEach(u => newLogs.push(u));
              receivingNode.isUpdating = true;
              anyTableUpdated = true;
            } else {
              newLogs.push(`     [INFO] No changes (all routes already optimal)`);
            }
        }

        if (anyTableUpdated) {
            somethingChangedInNetwork = true;
            return updatedNodes;
        } else {
            return currentNodes;
        }
      });
    } else {
      newLogs.push('');
      newLogs.push('[WAITING] No packets arrived yet');
    }
    
    // Clear processed packets
    setPackets(currentPackets => currentPackets.filter(p => p.progress < 1 || p.type !== 'rip'));

    // PHASE 3: Send routing updates
    const shouldSendPackets = somethingChangedInNetwork || simulationStep.current < 2;
    
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0 && shouldSendPackets) {
        const allNewPackets: Packet[] = [];
        
        newLogs.push('');
        newLogs.push('[BROADCASTING ROUTING TABLES]');
        
        currentNodes.forEach(fromNode => {
            const neighbors = edgesRef.current
                .filter(e => e.active && (e.from === fromNode.id || e.to === fromNode.id))
                .map(e => (e.from === fromNode.id ? e.to : e.from));

            if (neighbors.length > 0) {
                const routes = Object.entries(fromNode.routingTable as RipRoutingTable)
                  .filter(([dest]) => dest !== fromNode.id)
                  .map(([dest, route]) => `${dest}:${route.cost >= 16 ? 'INF' : route.cost}`)
                  .join(', ');
                newLogs.push(`  Router ${fromNode.id} -> [${neighbors.join(', ')}]: {${routes}}`);
                
                neighbors.forEach(neighborId => {
                    const toNode = currentNodes.find(n => n.id === neighborId)!;
                    allNewPackets.push({
                        id: `pkt-${Date.now()}-${Math.random()}`,
                        from: fromNode.id,
                        to: neighborId,
                        type: 'rip',
                        data: JSON.parse(JSON.stringify(fromNode.routingTable)),
                        progress: 0,
                        path: [{ x: fromNode.x, y: fromNode.y }, { x: toNode.x, y: toNode.y }]
                    });
                });
            }
        });
        
        if (allNewPackets.length > 0) {
            setPackets(p => [...p, ...allNewPackets]);
        }
    } else {
      newLogs.push('');
      newLogs.push('[STABLE] No broadcasts needed');
    }
    
    // Add logs
    if (newLogs.length > 0) {
      setLog(prevLog => [...newLogs.map(l => `[${new Date().toLocaleTimeString()}] ${l}`).reverse(), ...prevLog.slice(0, MAX_LOG_ENTRIES - newLogs.length)]);
    }

    // PHASE 4: Convergence check
    if (somethingChangedInNetwork || packetsRef.current.length > 0) {
        convergenceCounter.current = 0;
    } else {
        convergenceCounter.current++;
    }

    const numNodes = nodesRef.current.length;
    const vMinus1 = numNodes - 1;
    if (numNodes > 0 && convergenceCounter.current >= vMinus1 && packetsRef.current.length === 0) {
        addLog('');
        addLog('╔═══════════════════════════════════════════════════════╗');
        addLog('║  [CONVERGENCE ACHIEVED]                                ║');
        addLog('╚═══════════════════════════════════════════════════════╝');
        addLog(`Network stable for ${vMinus1} iterations (Bellman-Ford V-1 theorem)`);
        addLog('All routing tables are optimal. Simulation complete.');
        setIsRunning(false);
        setIsSimulating(false);
    } else if (packetsRef.current.length === 0 && convergenceCounter.current > 0) {
        addLog(`[STABILITY] ${convergenceCounter.current}/${vMinus1} iterations (need ${vMinus1 - convergenceCounter.current} more)`);
    }

    simulationStep.current++;
  }, [addLog]);

  // OSPF Implementation
  const runOspfStep = useCallback(() => {
    let somethingChangedInNetwork = false;
    let newLogs: string[] = [];

    newLogs.push('');
    newLogs.push(`╔═══════════════════════════════════════════════════════╗`);
    newLogs.push(`║  ITERATION ${simulationStep.current} - OSPF Link-State Routing (Dijkstra)`);
    newLogs.push(`╚═══════════════════════════════════════════════════════╝`);

    // PHASE 1: Show current Link-State Databases
    newLogs.push('');
    newLogs.push('[LINK-STATE DATABASES (LSDB)]');
    nodesRef.current.forEach(node => {
      if (node.ospfData) {
        const lsdbSize = Object.keys(node.ospfData.linkStateDatabase).length;
        newLogs.push(`  Router ${node.id}: ${lsdbSize} LSA(s) in database`);
        Object.entries(node.ospfData.linkStateDatabase).forEach(([routerId, lsa]) => {
          const links = lsa.links.filter(l => l.active).map(l => `${l.to}(cost ${l.cost})`).join(', ');
          newLogs.push(`     LSA from ${routerId} seq=${lsa.sequenceNumber}: neighbors [${links}]`);
        });
      }
    });

    // PHASE 2: Process LSA packets (flooding)
    const finishedPackets = packetsRef.current.filter(p => p.progress >= 1 && p.type === 'ospf-lsa');
    
    if (finishedPackets.length > 0) {
      newLogs.push('');
      newLogs.push(`[LSA FLOODING - Processing ${finishedPackets.length} LSA(s)]`);
      
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
            const links = lsa.links.filter(l => l.active).map(l => `${l.to}:${l.cost}`).join(', ');
            
            if (!existingLSA) {
              newLogs.push(`  Router ${receivingNode.id}: [NEW LSA] from ${lsa.routerId} seq=${lsa.sequenceNumber}, links: [${links}]`);
            } else {
              newLogs.push(`  Router ${receivingNode.id}: [UPDATED LSA] from ${lsa.routerId} seq ${existingLSA.sequenceNumber}→${lsa.sequenceNumber}`);
            }
            anyLSDBUpdated = true;
          } else if (existingLSA && existingLSA.sequenceNumber === lsa.sequenceNumber) {
            newLogs.push(`  Router ${receivingNode.id}: [DUPLICATE] LSA from ${lsa.routerId} seq=${lsa.sequenceNumber}, ignored`);
          }
        }

        // PHASE 3: Run Dijkstra's SPF if LSDB changed
        if (anyLSDBUpdated) {
          newLogs.push('');
          newLogs.push('[RUNNING DIJKSTRA SPF ALGORITHM]');
          somethingChangedInNetwork = true;
          
          // Recalculate routing tables using Dijkstra
          updatedNodes.forEach((node: Node) => {
            if (node.ospfData) {
              newLogs.push(`  Router ${node.id}: Computing shortest path tree...`);
              const oldTable = JSON.stringify(node.routingTable);
              const newRoutingTable = calculateOspfRoutes(node, updatedNodes, edgesRef.current);
              
              // Check if table actually changed
              if (oldTable !== JSON.stringify(newRoutingTable)) {
                const changes: string[] = [];
                Object.entries(newRoutingTable).forEach(([dest, route]) => {
                  const oldRoute = (node.routingTable as OspfRoutingTable)[dest];
                  if (!oldRoute) {
                    changes.push(`${dest} via ${route.nextHop} cost=${route.cost}`);
                  } else if (oldRoute.cost !== route.cost || oldRoute.nextHop !== route.nextHop) {
                    changes.push(`${dest} cost ${oldRoute.cost}→${route.cost} via ${route.nextHop}`);
                  }
                });
                
                node.routingTable = newRoutingTable;
                node.isUpdating = true;
                
                if (changes.length > 0) {
                  newLogs.push(`    [ROUTES UPDATED] ${changes.join(', ')}`);
                } else {
                  newLogs.push(`    [NO CHANGES] Routing table unchanged`);
                }
              } else {
                newLogs.push(`    [NO CHANGES] Same routes computed`);
              }
            }
          });
        }

        return anyLSDBUpdated ? updatedNodes : currentNodes;
      });
    } else {
      newLogs.push('');
      newLogs.push('[LSA FLOODING] No LSAs arrived');
    }

    // Clear processed packets
    setPackets(currentPackets => currentPackets.filter(p => p.progress < 1 || p.type !== 'ospf-lsa'));

    // PHASE 4: Generate and flood new LSAs
    const shouldSendPackets = somethingChangedInNetwork || simulationStep.current < 2;
    
    const currentNodes = nodesRef.current;
    if (currentNodes.length > 0 && shouldSendPackets) {
      const allNewPackets: Packet[] = [];
      
      newLogs.push('');
      newLogs.push('[ORIGINATING & FLOODING LSAs]');
      
      // Update LSDBs first (synchronously)
      const updatedNodes = currentNodes.map(fromNode => {
        if (!fromNode.ospfData) return fromNode;
        
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
        const updatedNode = JSON.parse(JSON.stringify(fromNode));
        updatedNode.ospfData.linkStateDatabase[fromNode.id] = lsa;

        // Flood to all neighbors
        const neighborIds = neighbors.map(n => n.to);
        if (neighborIds.length > 0) {
          const links = neighbors.map(n => `${n.to}:${n.cost}`).join(', ');
          newLogs.push(`  Router ${fromNode.id}: LSA seq=${lsa.sequenceNumber}, flooding to [${neighborIds.join(', ')}]`);
          newLogs.push(`    My links: [${links}]`);
          
          neighborIds.forEach(neighborId => {
            const toNode = currentNodes.find(n => n.id === neighborId)!;
            allNewPackets.push({
              id: `lsa-${Date.now()}-${Math.random()}`,
              from: fromNode.id,
              to: neighborId,
              type: 'ospf-lsa',
              data: JSON.parse(JSON.stringify(lsa)), // Deep copy
              progress: 0,
              path: [{ x: fromNode.x, y: fromNode.y }, { x: toNode.x, y: toNode.y }]
            });
          });
        }
        
        return updatedNode;
      });
      
      // Update node state with new LSDBs
      setNodes(updatedNodes);
      
      // Send all packets
      if (allNewPackets.length > 0) {
        setPackets(p => [...p, ...allNewPackets]);
      }
    } else {
      newLogs.push('');
      newLogs.push('[LSA GENERATION] Network stable, no new LSAs needed');
    }

    // Add all logs from this step
    if (newLogs.length > 0) {
      setLog(prevLog => [...newLogs.map(l => `[${new Date().toLocaleTimeString()}] ${l}`).reverse(), ...prevLog.slice(0, MAX_LOG_ENTRIES - newLogs.length)]);
    }

    // Convergence check
    if (somethingChangedInNetwork || packetsRef.current.length > 0) {
      convergenceCounter.current = 0;
    } else {
      convergenceCounter.current++;
    }

    const numNodes = nodesRef.current.length;
    if (numNodes > 0 && convergenceCounter.current >= numNodes && packetsRef.current.length === 0) {
      addLog('');
      addLog('╔═══════════════════════════════════════════════════════╗');
      addLog('║  [CONVERGENCE ACHIEVED]                                ║');
      addLog('╚═══════════════════════════════════════════════════════╝');
      addLog(`All routers have synchronized LSDBs. Network converged.`);
      addLog('Dijkstra SPF computation complete. Routing tables are optimal.');
      setIsRunning(false);
      setIsSimulating(false);
    } else if (packetsRef.current.length === 0 && convergenceCounter.current > 0) {
      addLog(`[STABILITY] ${convergenceCounter.current}/${numNodes} iterations stable`);
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
  
  // Packet animation - ONLY increments progress, does NOT remove packets
  // Packet removal is handled by runRipStep/runOspfStep after processing
  useEffect(() => {
    if (packets.length === 0 && !isRunning) return;
    let animationFrameId: number;
    const animate = () => {
        setPackets(currentPackets => 
            currentPackets
                .map(p => ({ 
                  ...p, 
                  // Slower animation: 0.005 * speed means packets take longer to traverse
                  // Cap at 1.05 to prevent visual overflow beyond destination node
                  progress: Math.min(p.progress + 0.005 * speed, 1.05) 
                }))
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
