
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
    description: "A distance-vector model based on RIP concepts, not a full protocol implementation.",
    details: [
      "RIP uses hop count as its sole routing metric. Every link between routers has a cost of 1 hop.",
      "The simulator applies distance-vector updates: routers share their simulated routing tables with adjacent routers. It animates those updates instead of sending RIP packets.",
      "A router compares each neighbor's advertised distance plus the link cost with its current route, accepting better alternatives and changed costs from the current next hop.",
      "RIP has a maximum hop count of 15. Any route with a cost of 16 is considered infinite, marking that destination as unreachable.",
      "The demo stops after several unchanged update rounds. This is a simulator stopping rule, not a guarantee about real RIP timers or convergence.",
      "After a link failure, routes can count to infinity as neighbors advertise stale information. This model does not implement split horizon or route poisoning.",
      "Use Case: Best suited for small, simple networks where simplicity is more important than fast convergence or optimal path selection.",
    ],
  },
  ospf: {
    title: "Open Shortest Path First (OSPF)",
    description: "A link-state model based on OSPF concepts and Dijkstra's algorithm, not a full protocol implementation.",
    details: [
      "Each router builds a simulated Link-State Database (LSDB) from Link-State Advertisements (LSAs) flooded over the network. The model uses one area and does not send real OSPF packets.",
      "Each router independently runs Dijkstra's Shortest Path First (SPF) algorithm on its LSDB to calculate the shortest path tree and build its routing table.",
      "OSPF uses bandwidth-based cost metrics. In this simulation, cost = 10,000 / bandwidth_mbps. Higher bandwidth links have lower costs and are preferred.",
      "Data Structures: Dijkstra uses a custom MinHeap but scans the full link list for each reachable router, adding O(VE) work to O((V+E) log V) heap work.",
      "The computed tree is shortest for the topology currently in the LSDB. This demo does not model OSPF timers, retransmission, multi-area scaling, or real packet forwarding.",
      "Use this simulator to compare routing ideas on small networks, not to predict production convergence time or loop behavior.",
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

