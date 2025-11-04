# Evolution of Network Package Routing

## 1. Cover Page:

**The Evolution of Network Routing:**<br>
**Made by :**

**2024bcs0096** — Prajwal Kumar K

**2024bcy0024** — Anupam Mishra

**2024bcy0032** — Kushal Arora

**2024bec0040** — Saawan Rana

**Course Code & Name:** ICS215 — Data Structures - II

**Faculty Name:** Dr. Sarah Renjit

**Date of Submission:** 29 September 2025

## 2. Introduction:

**Brief Background:** The internet is an extremely complex system, and specifically we realized the routing of packages in particular makes beautiful use of various network protocols and graphs. Our project will delve into the logic behind 2 specific protocols and their place in the history of package routing.

**Motivation and Data Structures used :** The motivation behind this project is to create an interactive tool that demystifies the abstract concepts of package routing. By visually simulating different routing philosophies, we can understand not only how they work but why they were designed the way they were, and why modern protocols are so resilient. This entire field is fundamentally governed by Data Structures; the network itself is a **Graph**, routing decisions are stored and looked up in **Hash Tables**, and efficient path finding is achieved using **Priority Queues**. Our project aims to make these connections tangible.

## 3. Problem Statement:

This project aims to design and develop an interactive, web-based simulator to visually demonstrate and compare two fundamental routing philosophies: **Distance-Vector** (exemplified by the Routing Information Protocol, RIP) and **Link-State** (exemplified by the Open Shortest Path First, OSPF protocol).

The scope of the project includes:

Allowing a user to dynamically create a custom network topology (a graph of nodes and weighted edges).

Implementing a turn-based simulation of the Distance-Vector protocol to show its slow, "routing-by-rumor" convergence.

Visually demonstrating the infamous **"Counting to Infinity"** problem, a critical failure mode inherent in the Distance-Vector approach.

Implementing a simulation of the Link-State protocol, showing how it builds a complete network map (LSDB) and uses Dijkstra's algorithm to rapidly and accurately calculate routes.

Providing a clear, side-by-side comparison that highlights the superiority and robustness of the modern Link-State approach.

## 4. Objectives:

To develop an intuitive visual tool that makes abstract routing algorithms accessible and understandable.

To implement and contrast the core logic of a Distance-Vector protocol (RIP) and a Link-State protocol (OSPF).

To create a live, demonstrable scenario showcasing the **"Counting to Infinity"** flaw.

To clearly illustrate the practical application and importance of Graph, Hash Table, and Priority Queue data structures in solving a real-world engineering problem.

## 5. Literature Survey

The foundational principles for this project are drawn from established internet standards and academic literature. The Distance-Vector approach is formally defined in **RFC 1058**, which specifies the Routing Information Protocol (RIP). It describes the simple, hop-count-based metric and the process of routers advertising their entire routing tables to neighbors. In contrast, the Link-State approach is defined in **RFC 2328**, which details the Open Shortest Path First (OSPF) protocol. It specifies the use of Link-State Advertisements (LSAs), the "flooding" mechanism for distributing them, and the mandatory use of the Dijkstra algorithm for path calculation.

Standard networking textbooks, such as Kurose and Ross's **"Computer Networking: A Top-Down Approach,"** compare these two philosophies directly. They highlight the trade-offs: RIP's simplicity and low computational overhead versus OSPF's complexity, speed, and robustness. The **"Counting to Infinity"** problem is a well-documented limitation of RIP discussed in these texts. While many resources describe these protocols, a research gap exists for interactive tools that allow a user to visually compare both protocols' dynamic behavior and failure modes on the same user-defined network topology. This project aims to fill that gap.

## 6. Relevance / Societal Impact:

The primary societal impact of this project is educational. It transforms a complex, invisible process into an interactive and engaging learning experience. By allowing students to "break" the network and see the consequences, it provides a deeper intuition for network engineering principles. The novelty of our approach lies not in implementing a single algorithm, but in crafting a narrative of technological evolution. By contrasting the flawed "rumor-based" system with the robust "map-based" system, we tell a compelling story about why modern networks are designed the way they are.

## 7. Approach & Methodology

Our approach follows a narrative to guide the user through the evolution of routing.

**Flowchart of User Interaction:**

**Act 1: The Past (RIP Works):** A user builds a network. They run the RIP simulation and watch as the routers slowly converge on the correct paths through a round-based "gossip" mechanism.(We also explain the necessity to use RIP back in the day (memory limitations) )

**Act 2: The Failure (RIP Breaks):** The user simulates a link failure. Running the RIP simulation again reveals the **"Counting to Infinity"** problem, where routers create a routing loop, unable to correct themselves.

**Act 3: The Present (OSPF Succeeds):** On the same broken network, the user switches to the OSPF simulation. They witness the rapid "flooding" of LSAs, the creation of a complete network map, and the immediate calculation of a new, correct path via Dijkstra's algorithm.

**Data Structures Employed:**

**Graph (Adjacency List):** The natural choice to represent the network. The list structure is efficient for finding the neighbors of any given router.

**Hash Table:** Used to implement the routing table in RIP and the Link-State Database in OSPF. This provides efficient O(1) average time complexity for lookups, insertions, and updates, which is critical for the simulation's performance.

**Priority Queue (Min-Heap):** Used to optimize the implementation of Dijkstra's algorithm within the OSPF simulation, reducing its time complexity from O(V²) to O(E log V).

Some other minor data structures such arrays will also be used

## 8. Current Status of Work

**Completed Tasks:**

• We've studied the core principles involved in package routing and also, detailed study on the protocols we're about to implement

• Initial Designs of how the interface will look are complete, added some basic React components, such as buttons , a way to add nodes etc, and chose appropriate js libraries.

• The logic for the Distance-Vector (RIP) protocol, including the round-based update mechanism, is implemented in cpp currently we're bring it over to js to connect it to our front end

• Finalize the visualization for the **"Counting to Infinity"** scenario.

• True implementation of the algorithms and connecting them with front end

• Implement the full Link-State (OSPF) protocol, including LSA flooding and the Dijkstra's algorithm module.

• Integrate the two simulations into a single, seamless user experience.

**Challenges Faced:**

Primary challenge was finding a way to visualize the data structures used clearly, along with making the front end actually use the algorithm (we know how the algorithm works, how to write just the algorithm but need to visualization to be actually based on this algorithm)

## 9. Implementation Details

**Programming Language:** JavaScript (ES6), React, tailwind css<br>
**Environment:** VS Code, nvim (anupam)

### Core Architecture & Data Structure Implementation

**Graph Representation:**
The network topology is implemented using an **Adjacency List** structure defined in `src/lib/types.ts`. Each node maintains its coordinates (x, y) for visualization and contains a routing table that adapts based on the selected protocol (RIP or OSPF). Edges store bidirectional connections with cost and bandwidth properties, enabling realistic network simulation.

<*insert image of Node and Edge interfaces from src/lib/types.ts lines 6-22*>

**Priority Queue Implementation:**
For OSPF's Dijkstra algorithm, we implemented a custom **MinHeap** class in `src/lib/data-structures.ts` that provides O(log n) insertion and extraction operations. The heap maintains an index map for efficient decrease-key operations, crucial for Dijkstra's performance optimization from O(V²) to O(E log V).

<*insert image of MinHeap class definition from src/lib/data-structures.ts lines 25-45*>

### Protocol Implementation Details

**Distance Vector (RIP) Implementation:**
The RIP protocol is implemented in the `runRipStep()` function in `src/app/page.tsx`. It follows the classic Bellman-Ford relaxation algorithm where each router shares its entire routing table with neighbors. The key implementation uses hash table lookups for route comparison and implements the "counting to infinity" problem with a maximum hop count of 16.

<*insert image of Bellman-Ford relaxation logic from src/app/page.tsx lines 210-230*>

The algorithm processes finished RIP packets and performs distance vector updates:
- Calculates new cost: `sender_cost_to_destination + link_cost_to_sender`
- Accepts routes only if `new_cost < existing_cost` (Bellman-Ford condition)
- Handles counting to infinity by marking routes with cost ≥ 16 as unreachable

**Link State (OSPF) Implementation:**
OSPF implementation consists of three phases executed in `runOspfStep()`:
1. **LSA Flooding**: Link State Advertisements are flooded throughout the network using packet-based simulation
2. **LSDB Construction**: Each router builds a complete Link State Database using hash table storage
3. **SPF Calculation**: Dijkstra's algorithm computes shortest paths using our custom MinHeap priority queue

<*insert image of OSPF three-phase implementation from src/app/page.tsx lines 430-450*>

The Dijkstra implementation maintains visited sets and distance arrays, with priority queue managing node processing order based on current shortest distance estimates.

<*insert image of Dijkstra's algorithm implementation from src/app/page.tsx lines 597-620*>

### Visualization & User Interface Integration

**React Component Architecture:**
The main simulation logic is encapsulated in `src/app/page.tsx` using React hooks for state management. The network canvas (`src/components/network-canvas.tsx`) handles interactive node placement and edge creation through drag-and-drop functionality.

**Real-time Animation System:**
Packet movement is animated using interpolated paths calculated from source to destination coordinates. The animation system updates packet progress (0 to 1) and renders movement along computed trajectories, providing visual feedback for protocol message exchanges.

<*insert image of packet animation logic from src/components/network-canvas.tsx lines showing packet rendering*>

**Protocol State Synchronization:**
The routing table display component (`src/components/routing-table-display.tsx`) dynamically updates to reflect current protocol state, with color-coded entries indicating route status (normal, infinite, newly learned) for educational clarity.

### Performance Optimizations

**Efficient Data Lookups:**
- Routing tables implemented as JavaScript Map objects providing O(1) average lookup time
- LSDB uses nested hash structure: `router_id -> {neighbor_id -> link_cost}` for fast topology queries  
- Node indexing maintains consistent ID-to-object mapping throughout simulation lifecycle

**Memory Management:**
- Packet objects are automatically garbage collected after reaching destination (progress ≥ 1)
- Routing table updates use immutable patterns to trigger React re-renders efficiently
- Large topology changes batch update operations to minimize computational overhead

## 10. Conclusion & Future Scope

The project has been successfully completed, achieving all the objectives outlined in our initial proposal. We have successfully developed a comprehensive interactive web-based simulator that effectively demonstrates and compares the two fundamental routing philosophies: Distance-Vector (RIP) and Link-State (OSPF) protocols.

This project has deepened our understanding of how fundamental data structures serve as the backbone of complex real world systems. Through implementing routing protocols, we discovered that **Graphs** are not only theoretical but the basis for representation of network topologies, where adjacency lists provide efficient neighbor discovery crucial for protocol operations. **Hash Tables** were used for both RIP's routing tables and OSPF's Link-State Database,showing how O(1) lookup performance directly impacts network convergence speed. Significantly, implementing Dijkstra's algorithm with **Priority Queues** revealed how the right data structure choice can transform algorithm complexity from O(V²) to O(E log V).

Beyond technical implementation, this project illuminated how data structure selection directly influences system behavior: RIP's simplicity (basic hash table lookups) enables easy implementation but creates vulnerability to routing loops, while OSPF's sophisticated use of priority queues and graph algorithms provides robustness at the cost of complexity. We learned that in network engineering, the choice of data structure fundamentally shapes protocol behavior, convergence properties, and failure modes. This experience has given us invaluable insight into how computer science theory translates into the infrastructure that powers global internet communication.

**Future Scope:**

While the current implementation successfully covers the evolution from Distance-Vector to Link-State protocols, a potential future extension would be to implement a simplified version of **BGP (Border Gateway Protocol)**. This would add a "fourth act" to our evolution story, demonstrating how routing between autonomous systems considers policy and business relationships rather than just technical metrics. BGP implementation would showcase how real world internet routing accounts for political, economic, and legal constraints—adding complexity beyond pure algorithmic optimization. However, this remains outside the current project scope due to BGP's intricate policy framework and numerous variables.

## 11. References

Malkin, G. (1988). RFC 1058: Routing Information Protocol. IETF.

Moy, J. (1998). RFC 2328: OSPF Version 2. IETF.

Kurose, J. F., & Ross, K. W. (2021). Computer Networking: A Top-Down Approach (8th ed.). Pearson.
