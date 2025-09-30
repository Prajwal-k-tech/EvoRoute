
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
      "It can be slow to converge after a network change and is susceptible to the 'counting to infinity' problem, where routers can get stuck in a loop advertising increasing costs.",
    ],
  },
  ospf: {
    title: "Open Shortest Path First (OSPF)",
    description: "A link-state routing protocol. (Coming Soon)",
    details: [
      "OSPF builds a complete map (topology) of the network in its link-state database.",
      "When a link state changes, the router floods a Link State Advertisement (LSA) to all other routers in the same area.",
      "It uses Dijkstra's algorithm to calculate the shortest path to all destinations.",
      "OSPF converges much faster than RIP and is less prone to routing loops.",
      "It is more complex and resource-intensive than RIP, but is highly scalable for large networks.",
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
        <CardContent className="flex-1">
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            {content.details.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
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

    