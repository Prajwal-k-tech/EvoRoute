
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
    description: "A distance-vector routing protocol.",
    details: [
      "RIP uses hop count as its routing metric.",
      "Routers periodically send their entire routing table to their neighbors (every 30 seconds, accelerated here).",
      "It uses the Bellman-Ford algorithm to calculate the best path.",
      "RIP has a maximum hop count of 15 to prevent routing loops. A hop count of 16 is considered infinite (unreachable).",
      "Subject to the 'counting to infinity' problem, where it slowly converges after a link failure.",
    ],
  },
  ospf: {
    title: "Open Shortest Path First (OSPF)",
    description: "A link-state routing protocol. (Coming Soon)",
    details: [
      "OSPF builds a complete map (topology) of the network in its link-state database.",
      "When a link state changes, the router floods a Link State Advertisement (LSA) to all other routers.",
      "It uses Dijkstra's algorithm to calculate the shortest path to all destinations.",
      "It converges much faster than RIP and is not prone to the 'counting to infinity' problem.",
      "OSPF is more complex and requires more CPU and memory than RIP.",
    ],
  },
};

export function ExplanationPanel({ algorithm, log }: ExplanationPanelProps) {
  const content = explanations[algorithm];
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [log]);

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full">
      <Card className="md:w-1/2">
        <CardHeader>
          <CardTitle>{content.title}</CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>
        <CardContent>
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
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-6 pb-6" ref={scrollAreaRef}>
            <div className="space-y-2">
            {log.length === 0 && <p className="text-sm text-muted-foreground">Run the simulation to see the log.</p>}
              {log.map((entry, i) => (
                <div key={i} className="text-sm font-code">
                  <span className="text-primary mr-2">[{i+1}]</span>
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

    