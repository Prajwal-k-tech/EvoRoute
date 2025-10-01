
"use client";

import type { Node, Algorithm, RipRoute, OspfRoute } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "./ui/scroll-area";
import { useMemo } from "react";

interface RoutingTableDisplayProps {
  nodes: Node[];
  isSimulating: boolean;
  algorithm: Algorithm;
}

export function RoutingTableDisplay({ nodes, isSimulating, algorithm }: RoutingTableDisplayProps) {

  const sortedNodes = useMemo(() => [...nodes].sort((a,b) => a.id.localeCompare(b.id)), [nodes]);

  const isRipRoute = (route: any): route is RipRoute => {
    return 'destination' in route && 'nextHop' in route && 'cost' in route && !('interface' in route);
  };

  const isOspfRoute = (route: any): route is OspfRoute => {
    return 'destination' in route && 'nextHop' in route && 'cost' in route;
  };

  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader>
        <CardTitle>Routing Tables</CardTitle>
        <CardDescription>
          {isSimulating ? 'Live updates from the simulation.' : 'Run simulation to populate tables.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-6 pb-6">
          <Accordion type="multiple" className="w-full">
            {sortedNodes.map((node) => {
              const tableEntries = Object.values(node.routingTable);
              return (
                <AccordionItem value={node.id} key={node.id}>
                  <AccordionTrigger className="font-code hover:no-underline">
                    Router {node.id}
                  </AccordionTrigger>
                  <AccordionContent>
                    {tableEntries.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Destination</TableHead>
                            <TableHead>Next Hop</TableHead>
                            <TableHead>Cost</TableHead>
                            {algorithm === 'ospf' && <TableHead>Interface</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableEntries.sort((a, b) => a.destination.localeCompare(b.destination)).map((route) => (
                            <TableRow key={`${node.id}-${route.destination}`}>
                              <TableCell className="font-code">{route.destination}</TableCell>
                              <TableCell className="font-code">{route.nextHop}</TableCell>
                              <TableCell className="font-code">{route.cost}</TableCell>
                              {algorithm === 'ospf' && isOspfRoute(route) && (
                                <TableCell className="font-code">{route.interface || '-'}</TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground font-code p-4 text-center">
                        Table is empty.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
             {nodes.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center">
                    Add nodes to the canvas to see routing tables.
                </p>
            )}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

    