# EvoRoute - Network Routing Protocol Simulator

## 🎯 Project Overview

**EvoRoute** is an interactive educational web application that demonstrates the evolution of network routing protocols by simulating and comparing two fundamental approaches:

1. **Distance-Vector Routing (RIP)** - Shows the "routing by rumor" approach and its failure modes
2. **Link-State Routing (OSPF)** - Demonstrates modern, robust routing with complete network visibility

### Purpose

This project serves as both an educational tool and a demonstration of fundamental **Data Structures** (DS2 course requirement) in action, specifically:
- **Graph Data Structures** (Adjacency List representation)
- **Priority Queue** (Min-Heap) for efficient shortest path computation
- **Hash Tables** for routing tables and link-state databases
- **Sets** for efficient membership testing

---

## 🏗️ Data Structures Implementation

### 1. **Graph Data Structure** (`src/lib/data-structures.ts`)

The network topology is represented as an **Adjacency List Graph**:

```typescript
class NetworkGraph {
  private adjacencyList: Map<string, GraphEdge[]>;  // Adjacency list
  private vertices: Set<string>;                     // Set of all vertices
  private edgeCount: number;                         // Total edges
}
```

**Key Operations:**
- `addVertex(id)` - O(1) - Add a router to the network
- `addEdge(from, to, bandwidth)` - O(1) - Create bidirectional link
- `getNeighbors(id)` - O(1) - Get adjacent routers
- `toggleEdge(from, to)` - O(1) - Simulate link failure/recovery

**Why Adjacency List?**
- Efficient for sparse graphs (typical networks)
- Fast neighbor lookup for routing updates
- Memory efficient: O(V + E) space complexity

### 2. **Priority Queue (Min-Heap)** (`src/lib/data-structures.ts`)

Used for **Dijkstra's algorithm** in OSPF routing:

```typescript
class MinHeap {
  private heap: HeapNode[];                    // Binary heap array
  private indexMap: Map<string, number>;       // Fast lookup by node ID
}
```

**Key Operations:**
- `insert(id, priority)` - O(log n) - Add node to queue
- `extractMin()` - O(log n) - Get node with minimum distance
- `decreaseKey(id, newPriority)` - O(log n) - Update distance when shorter path found

**Performance Impact:**
- Without MinHeap: O(V²) - Linear search for minimum
- With MinHeap: O((V+E) log V) - Logarithmic operations
- **Critical for scalability** in larger networks

### 3. **Routing Tables** (Hash Tables)

Both protocols use hash table structures for O(1) route lookups:

```typescript
// RIP uses simple destination → route mapping
type RipRoutingTable = {
  [destination: string]: {
    destination: string;
    nextHop: string;
    cost: number;
    isInfinite?: boolean;  // For counting to infinity detection
  };
};

// OSPF includes additional interface information
type OspfRoutingTable = {
  [destination: string]: {
    destination: string;
    nextHop: string;
    cost: number;
    interface: string;
  };
};
```

### 4. **Link-State Database** (OSPF)

Each OSPF router maintains a complete network map:

```typescript
interface LinkStateAdvertisement {
  routerId: string;
  sequenceNumber: number;      // For determining freshness
  age: number;
  links: {
    to: string;
    cost: number;
    active: boolean;
  }[];
  timestamp: number;
}

// LSDB is a hash table of LSAs
linkStateDatabase: { [routerId: string]: LinkStateAdvertisement }
```

---

## 🔬 Algorithm Implementations

### **RIP (Routing Information Protocol)** - Distance Vector

**Core Algorithm:** Distributed Bellman-Ford

**How It Works:**

1. **Initialization:** Each router knows only its directly connected neighbors (cost = 1 hop)

2. **Periodic Updates (every round):**
   ```
   For each neighbor N:
     Send entire routing table to N
   
   For each received table from neighbor N:
     For each destination D in N's table:
       new_cost = cost_to_N + N_cost_to_D
       if new_cost < my_current_cost_to_D:
         Update: route_to_D = { nextHop: N, cost: new_cost }
   ```

3. **Hop Count Metric:** All links = 1 hop (regardless of bandwidth)

4. **Maximum Hop Count:** 16 = Infinity (unreachable)

**Key Code Section** (`src/app/page.tsx`):
```typescript
const runRipStep = () => {
  // 1. Process incoming routing advertisements
  for (const packet of finishedPackets) {
    const senderTable = packet.data;
    for (const dest in senderTable) {
      const newCost = senderTable[dest].cost + linkCost;
      if (newCost < existingRoute.cost) {
        // Better path found!
        receivingNode.routingTable[dest] = {
          nextHop: sender,
          cost: newCost,
          isInfinite: newCost >= 16
        };
      }
    }
  }
  
  // 2. Send own table to neighbors
  for (const neighbor of neighbors) {
    sendPacket(myRoutingTable, neighbor);
  }
};
```

**The "Counting to Infinity" Problem:**

When a link fails, routers can form temporary routing loops:

```
Initial: A ←→ B ←→ C  (all links active)
Failure: A ←→ B  X  C  (B-C link breaks)

Round 1: C's route to A (cost 2) is lost
         But A still advertises "I can reach C (cost 2)"
         B believes A and updates: route to C via A, cost 3
         
Round 2: B tells A: "I can reach C, cost 3"
         A updates: route to C via B, cost 4
         
Round 3: A tells B: "I can reach C, cost 4"
         B updates: route to C via A, cost 5
         
... continues until cost reaches 16 (infinity)
```

**Visualization:** Nodes with infinite routes (cost ≥ 16) are highlighted in **red** with a warning ring.

---

### **OSPF (Open Shortest Path First)** - Link State

**Core Algorithm:** Dijkstra's Shortest Path First + LSA Flooding

**Two-Phase Process:**

#### **Phase 1: LSA Flooding (Build the Map)**

1. Each router creates a **Link-State Advertisement (LSA)**:
   ```typescript
   const lsa: LinkStateAdvertisement = {
     routerId: myId,
     sequenceNumber: currentSeq + 1,
     links: [
       { to: 'A', cost: 100, active: true },  // cost = 10000 / bandwidth
       { to: 'B', cost: 10, active: true },
     ]
   };
   ```

2. **Flood LSA to all neighbors**
3. Each router that receives an LSA:
   - Checks if it's newer (higher sequence number)
   - If yes: Install in LSDB and **forward to all other neighbors**
   - Result: Every router has **identical network map**

#### **Phase 2: Dijkstra's Algorithm (Calculate Routes)**

Once LSDB is complete, each router independently calculates shortest paths:

```typescript
const calculateOspfRoutes = (sourceNode) => {
  // Initialize MinHeap Priority Queue
  const pq = new MinHeap();
  const distances = {};
  const previous = {};
  
  // Start with source
  distances[sourceNode] = 0;
  pq.insert(sourceNode, 0);
  
  while (!pq.isEmpty()) {
    // Extract node with minimum distance - O(log V)
    const current = pq.extractMin();
    
    // Examine all neighbors
    for (const neighbor of graph.getNeighbors(current.id)) {
      const alt = distances[current.id] + edge.cost;
      
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current.id;
        pq.decreaseKey(neighbor, alt);  // O(log V)
      }
    }
  }
  
  // Build routing table from shortest path tree
  return buildRoutingTable(distances, previous);
};
```

**Cost Metric:** Based on bandwidth
```
cost = 10,000 / bandwidth_in_mbps

Examples:
- 10 Gbps   → cost = 1
- 1 Gbps    → cost = 10
- 100 Mbps  → cost = 100  (default)
- 10 Mbps   → cost = 1000
```

**Key Advantage:** When link fails, LSA is immediately flooded. All routers:
1. Update their LSDB (remove dead link)
2. Re-run Dijkstra with new map
3. **No loops, fast convergence**

---

## 🎨 Visualization Features

### RIP Visualization
- **Packet Animation:** Small glowing orbs travel between routers showing advertisements
- **Table Updates:** Nodes flash **yellow** (#CFD11A) when routing table changes
- **Counting to Infinity:** 
  - Infinite routes (cost ≥ 16) shown in **red** in routing table
  - Affected nodes have red warning ring
  - Log shows "⚠️ COUNTING TO INFINITY" alerts

### OSPF Visualization
- **LSA Flooding:** Burst of packets radiating across network during database sync
- **Dijkstra Process:**
  - Nodes being processed: pulsing **gray** highlight
  - Visited nodes: **white** highlight
  - Shortest path: thick **green** lines

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open browser to http://localhost:9002

# Type check
npm run typecheck

# Build for production
npm run build
```

---

## 📊 Project Structure

```
EvoRoute/
├── src/
│   ├── app/
│   │   └── page.tsx              # Main simulation logic
│   ├── components/
│   │   ├── network-canvas.tsx    # Graph visualization & interaction
│   │   ├── routing-table-display.tsx  # Live routing tables
│   │   ├── explanation-panel.tsx      # Algorithm explanations
│   │   ├── simulation-controls.tsx    # UI controls
│   │   └── bandwidth-dialog.tsx       # Link configuration
│   ├── lib/
│   │   ├── data-structures.ts    # ⭐ Graph & MinHeap implementations
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── utils.ts              # Utilities
│   └── hooks/
│       └── use-toast.ts          # Toast notifications
├── docs/
│   └── blueprint.md              # Design specifications
└── README.md                     # This file
```

---

## 🎓 Educational Value & DS2 Relevance

### Data Structures Demonstrated

| Structure | Location | Purpose | Complexity |
|-----------|----------|---------|------------|
| **Graph (Adjacency List)** | `data-structures.ts` | Network topology | O(V+E) space |
| **Priority Queue (MinHeap)** | `data-structures.ts` | Dijkstra's algorithm | O(log n) ops |
| **Hash Table** | Routing tables | Route lookups | O(1) average |
| **Set** | Dijkstra visited nodes | Membership testing | O(1) average |

### Algorithms Demonstrated

| Algorithm | Type | Complexity | Real-World Use |
|-----------|------|------------|----------------|
| **Bellman-Ford (Distributed)** | Dynamic Programming | O(V·E) | RIP, BGP |
| **Dijkstra's** | Greedy | O((V+E) log V) | OSPF, IS-IS |
| **Flooding** | Graph Traversal | O(E) messages | LSA distribution |

### Learning Outcomes

1. **Graph Theory in Practice:** See how networks are modeled as graphs
2. **Priority Queue Benefits:** Compare O(V²) vs O((V+E) log V) performance
3. **Distributed Systems:** Understand how routers cooperate without central control
4. **Algorithm Trade-offs:** RIP simplicity vs OSPF scalability
5. **Real-World CS:** These exact algorithms run on real internet routers!

---

## 🔬 Testing the Simulation

### Experiment 1: Basic Convergence
1. Select **RIP** algorithm
2. Click **Run**
3. Observe: Tables gradually populate as routers share information
4. Check: All routers eventually learn all routes

### Experiment 2: Counting to Infinity (RIP Failure)
1. Start with RIP, let network converge
2. Click an edge to break it (turns red)
3. Click **Run** again
4. **Observe:** Cost to unreachable destination increments (2→3→4→...→16)
5. **See:** Red highlighting and "⚠️ COUNTING TO INFINITY" logs

### Experiment 3: OSPF Fast Recovery
1. Switch to **OSPF** algorithm
2. Let network converge
3. Break a link
4. Click **Run**
5. **Observe:** Immediate LSA flooding, quick reconvergence, **no loops**

### Experiment 4: Bandwidth Effects (OSPF)
1. OSPF mode
2. Add new link between nodes
3. Set bandwidth to **10 Mbps** → cost = 1000
4. Add another link with **1000 Mbps** → cost = 10
5. **Observe:** OSPF prefers high-bandwidth path

---

## 📝 Key Insights

### Why RIP Fails
- **Incomplete Information:** Each router only knows what neighbors tell it
- **Slow Propagation:** Bad news spreads slowly
- **Routing Loops:** Can form temporary cycles during convergence

### Why OSPF Succeeds
- **Complete Map:** Every router sees the whole network
- **Fast Updates:** Link state changes flood immediately  
- **No Loops:** Dijkstra guarantees loop-free paths
- **Scalability:** Priority queue makes it efficient

### Data Structures Matter!
- **Without MinHeap:** Dijkstra is O(V²) → impractical for large networks
- **With MinHeap:** O((V+E) log V) → scales to thousands of routers
- **Graph Representation:** Adjacency list perfect for sparse networks

---

## 👤 Author

**Prajwal K**  
Data Structures 2 (DS2) Course Project  
October 2025

---

## 📚 References

1. **RIP (RFC 2453):** Routing Information Protocol
2. **OSPF (RFC 2328):** Open Shortest Path First
3. **Dijkstra's Algorithm:** "A note on two problems in connexion with graphs" (1959)
4. **Bellman-Ford Algorithm:** Dynamic Programming for shortest paths
5. **Network Routing Fundamentals:** Kurose & Ross, "Computer Networking"

---

## 🌟 Features Summary

✅ **Explicit Graph Data Structure** - Adjacency list with O(1) operations  
✅ **MinHeap Priority Queue** - Efficient Dijkstra implementation  
✅ **Faithful RIP Implementation** - True distance-vector with counting to infinity  
✅ **Faithful OSPF Implementation** - LSA flooding + Dijkstra's SPF  
✅ **Bandwidth-based Costs** - OSPF uses proper cost = 10000/BW formula  
✅ **Visual Feedback** - See algorithms in action with color highlights  
✅ **Interactive Network Building** - Add nodes, links, simulate failures  
✅ **Real-time Logging** - Track every algorithm step  
✅ **Educational Value** - Perfect for learning routing protocols & data structures  

---

**This project demonstrates both theoretical CS knowledge and practical software engineering, making it ideal for academic presentation and technical evaluation.** 🎓
