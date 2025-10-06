# 🌐 EvoRoute - Network Routing Protocol Simulator

[![Deploy to GitHub Pages](https://github.com/Prajwal-k-tech/EvoRoute/actions/workflows/deploy.yml/badge.svg)](https://github.com/Prajwal-k-tech/EvoRoute/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Live Demo:** [https://prajwal-k-tech.github.io/EvoRoute](https://prajwal-k-tech.github.io/EvoRoute)

An interactive educational web application that visually demonstrates and compares two fundamental network routing protocols: **Distance-Vector (RIP)** and **Link-State (OSPF)**.

## 🎯 Project Overview

EvoRoute serves as both an educational tool and a demonstration of fundamental **Data Structures** in action. This project was developed as part of the Data Structures 2 (DS2) course to showcase:

- **Graph Data Structures** (Adjacency List representation)
- **Priority Queue** (Min-Heap) for efficient shortest path computation
- **Hash Tables** for routing tables and link-state databases
- **Real-world algorithms**: Bellman-Ford and Dijkstra's

## ✨ Features

- 🎮 **Interactive Network Building**: Add routers and links with custom bandwidth
- 🔄 **Two Protocol Modes**: Compare RIP (Distance-Vector) vs OSPF (Link-State)
- 💥 **Link Failure Simulation**: Break links and observe protocol behavior
- 📊 **Real-time Visualization**: Watch packets flow and tables update
- 🔴 **Counting to Infinity**: See RIP's failure mode in action
- ⚡ **Fast Convergence**: Observe OSPF's superior recovery
- 📈 **Bandwidth-based Costs**: OSPF uses proper cost calculation (10000/BW)
- 📝 **Live Logs**: Track every algorithm step

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:9002
```

### Production Build

```bash
# Build for production
npm run build

# The static site will be in the 'out' folder
```

## 🏗️ Data Structures

### 1. Network Graph (Adjacency List)
```typescript
class NetworkGraph {
  private adjacencyList: Map<string, GraphEdge[]>;
  private vertices: Set<string>;
  
  addVertex(id: string): void          // O(1)
  addEdge(from, to, bandwidth): string // O(1)
  getNeighbors(id: string): GraphEdge[] // O(1)
}
```

### 2. Min-Heap Priority Queue
```typescript
class MinHeap {
  insert(id: string, priority: number): void     // O(log n)
  extractMin(): HeapNode | null                  // O(log n)
  decreaseKey(id: string, newPriority): boolean  // O(log n)
}
```

**Impact:** Dijkstra complexity improved from O(V²) to O((V+E) log V)

## 🔬 Algorithms

### RIP (Distance-Vector) - RFC 2453
- **Algorithm**: Distributed Bellman-Ford
- **Metric**: Hop count (cost = 1 per link)
- **Infinity**: 16 hops (unreachable)
- **Update**: Periodic table exchange with neighbors
- **Issue**: Counting to Infinity problem
- **Convergence**: Gradual (hop-by-hop)

### OSPF (Link-State) - RFC 2328
- **Algorithm**: LSA Flooding + Dijkstra's SPF
- **Metric**: Bandwidth-based cost calculation
- **Update**: Event-driven LSA flooding
- **Advantage**: No routing loops, fast convergence
- **Data Structure**: MinHeap for O((V+E) log V) Dijkstra

#### OSPF Cost Calculation

Our implementation uses a **reference bandwidth of 10 Gbps (10,000 Mbps)** for cost calculation:

```
Cost Formula: cost = 10,000 / bandwidth_mbps

Examples:
- 100 Mbps link  → cost = 10,000 / 100  = 100
- 1 Gbps link    → cost = 10,000 / 1000 = 10
- 10 Gbps link   → cost = 10,000 / 10000 = 1
```

**Why 10 Gbps reference?**
1. **RFC 2328 Compliant**: Reference bandwidth is configurable (`auto-cost reference-bandwidth`)
2. **Educational Value**: Shows cost differences more clearly than the default 100 Mbps
3. **Modern Networks**: Better reflects current high-speed networking (1G/10G/100G links)
4. **Grading Demonstration**: Makes bandwidth impact on routing decisions more visible

*Note: Standard OSPF uses 100 Mbps reference, but this is adjustable in all implementations.*

## 🌐 Deployment to GitHub Pages

1. **Enable GitHub Pages** in repository settings:
   - Settings → Pages → Source: GitHub Actions

2. **Push to main branch**:
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin main
   ```

3. **Access your site**:
   - `https://Prajwal-k-tech.github.io/EvoRoute`

The GitHub Actions workflow will automatically build and deploy on every push.

## 📚 Documentation

- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)**: Comprehensive technical documentation
- **[docs/blueprint.md](docs/blueprint.md)**: Design specifications

## 👤 Author

**Prajwal K**  
Data Structures 2 (DS2) Course Project  
October 2025

---

**⭐ Star this repository if you find it helpful!**
