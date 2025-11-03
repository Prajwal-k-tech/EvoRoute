
"use client";

import { Algorithm } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef } from "react";

interface ExplanationPanelProps {
  algorithm: Algorithm;
  log: string[];
}

const explanations = {
  rip: {
    title: "Routing Information Protocol (RIP)",
    description: "A classic distance-vector routing protocol.",
    details: [
      "RIP uses hop count as its sole routing metric. Every link between routers has a cost of 1 hop.",
      "It is a distributed application of the Bellman-Ford algorithm. Routers periodically share their entire routing table with their immediate neighbors.",
      "By receiving a neighbor's table, a router learns about the total cost (hop count) to reach all network destinations via that neighbor and updates its own table if a shorter path is found.",
      "RIP has a maximum hop count of 15. Any route with a cost of 16 is considered infinite, marking that destination as unreachable.",
      "The Bellman-Ford algorithm guarantees convergence in at most V-1 iterations (where V is the number of nodes) when the network is stable.",
      "Known Limitations: RIP can be slow to converge after a network failure. The 'counting to infinity' problem occurs when two routers form a routing loop, continuously advertising incrementing costs (2→3→4...→16) until reaching the infinity threshold. Solutions include split horizon (don't advertise routes back to their source) and route poisoning.",
      "Use Case: Best suited for small, simple networks where simplicity is more important than fast convergence or optimal path selection.",
    ],
  },
  ospf: {
    title: "Open Shortest Path First (OSPF)",
    description: "A link-state routing protocol using Dijkstra's algorithm.",
    details: [
      "OSPF builds a complete map (topology) of the network in its Link-State Database (LSDB). Each router knows the entire network topology.",
      "When a link state changes, the router floods a Link State Advertisement (LSA) to all other routers in the same area, ensuring all routers have synchronized information.",
      "Each router independently runs Dijkstra's Shortest Path First (SPF) algorithm on its LSDB to calculate the shortest path tree and build its routing table.",
      "OSPF uses bandwidth-based cost metrics. In this simulation, cost = 10,000 / bandwidth_mbps. Higher bandwidth links have lower costs and are preferred.",
      "Data Structures: Uses a MinHeap priority queue for Dijkstra's algorithm, ensuring O((V+E) log V) time complexity for shortest path computation.",
      "Advantages: Converges much faster than RIP (typically seconds vs. minutes), completely avoids routing loops due to complete network visibility, and scales well with hierarchical areas.",
      "Use Case: Preferred for medium to large enterprise networks requiring fast convergence, loop-free routing, and bandwidth-aware path selection.",
    ],
  },
};

export function ExplanationPanel({ algorithm, log }: ExplanationPanelProps) {
  const content = explanations[algorithm];
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [log]);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      <Card className="md:w-1/2 flex flex-col">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full px-6 pb-6">
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {content.details.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
      <Card className="flex-1 flex flex-col min-h-0 md:w-1/2">
        <CardHeader>
          <CardTitle>Simulation Log</CardTitle>
          <CardDescription>What's happening in the network right now.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full px-6 pb-6" viewportRef={scrollViewportRef}>
            <div className="space-y-2">
            {log.length === 0 && <p className="text-sm text-muted-foreground">Run the simulation to see the log.</p>}
              {log.map((entry, i) => (
                <div key={i} className="text-sm font-code">
                  {entry}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

    