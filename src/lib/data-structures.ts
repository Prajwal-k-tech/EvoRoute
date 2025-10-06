/**
 * DATA STRUCTURES FOR NETWORK ROUTING SIMULATION
 * 
 * This file contains explicit implementations of fundamental data structures
 * used in routing protocol simulations:
 * 
 * 1. Graph (Adjacency List representation)
 * 2. MinHeap/Priority Queue (for Dijkstra's algorithm)
 * 3. Network Graph utilities
 */

// ============================================================================
// PRIORITY QUEUE (MIN HEAP) IMPLEMENTATION
// ============================================================================
// Used for efficient implementation of Dijkstra's shortest path algorithm
// Time Complexity: Insert O(log n), Extract-Min O(log n), Decrease-Key O(log n)
// ============================================================================

export interface HeapNode {
  id: string;
  priority: number;
}

export class MinHeap {
  private heap: HeapNode[];
  private indexMap: Map<string, number>; // Maps node id to its index in heap

  constructor() {
    this.heap = [];
    this.indexMap = new Map();
  }

  /**
   * Get the number of elements in the heap
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Check if heap is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Insert a new node with given priority
   * Time Complexity: O(log n)
   */
  insert(id: string, priority: number): void {
    const node: HeapNode = { id, priority };
    this.heap.push(node);
    const index = this.heap.length - 1;
    this.indexMap.set(id, index);
    this.bubbleUp(index);
  }

  /**
   * Extract and return the node with minimum priority
   * Time Complexity: O(log n)
   */
  extractMin(): HeapNode | null {
    if (this.isEmpty()) return null;

    const min = this.heap[0];
    const last = this.heap.pop()!;

    this.indexMap.delete(min.id);

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.indexMap.set(last.id, 0);
      this.bubbleDown(0);
    }

    return min;
  }

  /**
   * Decrease the priority of a node (used in Dijkstra's when we find shorter path)
   * Time Complexity: O(log n)
   */
  decreaseKey(id: string, newPriority: number): boolean {
    const index = this.indexMap.get(id);
    if (index === undefined) return false;

    if (newPriority >= this.heap[index].priority) return false;

    this.heap[index].priority = newPriority;
    this.bubbleUp(index);
    return true;
  }

  /**
   * Check if a node exists in the heap
   */
  contains(id: string): boolean {
    return this.indexMap.has(id);
  }

  /**
   * Get the priority of a node
   */
  getPriority(id: string): number | undefined {
    const index = this.indexMap.get(id);
    return index !== undefined ? this.heap[index].priority : undefined;
  }

  /**
   * Bubble up operation to maintain heap property
   */
  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      
      if (this.heap[index].priority >= this.heap[parentIndex].priority) {
        break;
      }

      this.swap(index, parentIndex);
      index = parentIndex;
    }
  }

  /**
   * Bubble down operation to maintain heap property
   */
  private bubbleDown(index: number): void {
    while (true) {
      let minIndex = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < this.heap.length && 
          this.heap[leftChild].priority < this.heap[minIndex].priority) {
        minIndex = leftChild;
      }

      if (rightChild < this.heap.length && 
          this.heap[rightChild].priority < this.heap[minIndex].priority) {
        minIndex = rightChild;
      }

      if (minIndex === index) break;

      this.swap(index, minIndex);
      index = minIndex;
    }
  }

  /**
   * Swap two nodes in the heap and update index map
   */
  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.indexMap.set(this.heap[i].id, i);
    this.indexMap.set(this.heap[j].id, j);
  }

  /**
   * Get all nodes in the heap (for debugging)
   */
  getAllNodes(): HeapNode[] {
    return [...this.heap];
  }
}

// ============================================================================
// GRAPH DATA STRUCTURE (ADJACENCY LIST REPRESENTATION)
// ============================================================================
// Used to represent the network topology
// Supports both directed and undirected edges
// ============================================================================

export interface GraphEdge {
  to: string;
  cost: number;
  bandwidth?: number; // in Mbps
  active: boolean;
  edgeId: string;
}

export class NetworkGraph {
  private adjacencyList: Map<string, GraphEdge[]>;
  private vertices: Set<string>;
  private edgeCount: number;

  constructor() {
    this.adjacencyList = new Map();
    this.vertices = new Set();
    this.edgeCount = 0;
  }

  /**
   * Add a vertex (router) to the graph
   */
  addVertex(id: string): void {
    if (!this.vertices.has(id)) {
      this.vertices.add(id);
      this.adjacencyList.set(id, []);
    }
  }

  /**
   * Remove a vertex and all its edges
   */
  removeVertex(id: string): void {
    if (!this.vertices.has(id)) return;

    // Remove all edges to this vertex
    for (const vertex of this.vertices) {
      this.removeEdge(vertex, id);
    }

    // Remove the vertex itself
    this.adjacencyList.delete(id);
    this.vertices.delete(id);
  }

  /**
   * Add an undirected edge between two vertices
   * For OSPF: cost = 10000 / bandwidth (in Mbps)
   * For RIP: cost = 1 (hop count)
   */
  addEdge(
    from: string, 
    to: string, 
    bandwidth: number = 100, // Default 100 Mbps
    useOspfCost: boolean = false
  ): string {
    // Ensure both vertices exist
    this.addVertex(from);
    this.addVertex(to);

    // Calculate cost
    const cost = useOspfCost ? Math.round(10000 / bandwidth) : 1;
    const edgeId = `${from}-${to}`;

    // Add edge in both directions (undirected graph)
    const forwardEdge: GraphEdge = { to, cost, bandwidth, active: true, edgeId };
    const backwardEdge: GraphEdge = { to: from, cost, bandwidth, active: true, edgeId };

    this.adjacencyList.get(from)!.push(forwardEdge);
    this.adjacencyList.get(to)!.push(backwardEdge);

    this.edgeCount++;
    return edgeId;
  }

  /**
   * Remove an edge between two vertices
   */
  removeEdge(from: string, to: string): void {
    const fromEdges = this.adjacencyList.get(from);
    const toEdges = this.adjacencyList.get(to);

    if (fromEdges) {
      const index = fromEdges.findIndex(e => e.to === to);
      if (index !== -1) {
        fromEdges.splice(index, 1);
        this.edgeCount--;
      }
    }

    if (toEdges) {
      const index = toEdges.findIndex(e => e.to === from);
      if (index !== -1) {
        toEdges.splice(index, 1);
      }
    }
  }

  /**
   * Toggle edge active status (for simulating link failures)
   */
  toggleEdge(from: string, to: string, active?: boolean): boolean {
    const fromEdges = this.adjacencyList.get(from);
    const toEdges = this.adjacencyList.get(to);
    
    let toggled = false;

    if (fromEdges) {
      const edge = fromEdges.find(e => e.to === to);
      if (edge) {
        edge.active = active !== undefined ? active : !edge.active;
        toggled = true;
      }
    }

    if (toEdges) {
      const edge = toEdges.find(e => e.to === from);
      if (edge) {
        edge.active = active !== undefined ? active : !edge.active;
      }
    }

    return toggled;
  }

  /**
   * Get all neighbors of a vertex (only active edges)
   */
  getNeighbors(id: string, includeInactive: boolean = false): GraphEdge[] {
    const edges = this.adjacencyList.get(id) || [];
    return includeInactive ? edges : edges.filter(e => e.active);
  }

  /**
   * Get all vertices
   */
  getVertices(): string[] {
    return Array.from(this.vertices);
  }

  /**
   * Get number of vertices
   */
  getVertexCount(): number {
    return this.vertices.size;
  }

  /**
   * Get number of edges
   */
  getEdgeCount(): number {
    return this.edgeCount;
  }

  /**
   * Check if edge exists between two vertices
   */
  hasEdge(from: string, to: string): boolean {
    const edges = this.adjacencyList.get(from);
    return edges ? edges.some(e => e.to === to) : false;
  }

  /**
   * Get edge between two vertices
   */
  getEdge(from: string, to: string): GraphEdge | undefined {
    const edges = this.adjacencyList.get(from);
    return edges?.find(e => e.to === to);
  }

  /**
   * Check if vertex exists
   */
  hasVertex(id: string): boolean {
    return this.vertices.has(id);
  }

  /**
   * Get the complete adjacency list (for debugging/visualization)
   */
  getAdjacencyList(): Map<string, GraphEdge[]> {
    return new Map(this.adjacencyList);
  }

  /**
   * Create a deep copy of the graph
   */
  clone(): NetworkGraph {
    const newGraph = new NetworkGraph();
    
    // Copy vertices
    for (const vertex of this.vertices) {
      newGraph.addVertex(vertex);
    }

    // Copy edges
    for (const [from, edges] of this.adjacencyList) {
      for (const edge of edges) {
        // Only add each edge once (avoid duplicates for undirected edges)
        if (from < edge.to) {
          newGraph.addEdge(from, edge.to, edge.bandwidth || 100, edge.cost > 1);
          if (!edge.active) {
            newGraph.toggleEdge(from, edge.to, false);
          }
        }
      }
    }

    return newGraph;
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.adjacencyList.clear();
    this.vertices.clear();
    this.edgeCount = 0;
  }

  /**
   * Get graph statistics (useful for debugging and reports)
   */
  getStats(): {
    vertices: number;
    edges: number;
    activeEdges: number;
    avgDegree: number;
  } {
    let activeEdges = 0;
    let totalDegree = 0;

    for (const edges of this.adjacencyList.values()) {
      activeEdges += edges.filter(e => e.active).length;
      totalDegree += edges.length;
    }

    return {
      vertices: this.vertices.size,
      edges: this.edgeCount,
      activeEdges: activeEdges / 2, // Divide by 2 for undirected edges
      avgDegree: this.vertices.size > 0 ? totalDegree / this.vertices.size : 0
    };
  }
}
