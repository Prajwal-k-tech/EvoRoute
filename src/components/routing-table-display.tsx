"use client";

import type { Node } from "@/lib/types";
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

interface RoutingTableDisplayProps {
  nodes: Node[];
  isSimulating: boolean;
}

export function RoutingTableDisplay({ nodes, isSimulating }: RoutingTableDisplayProps) {
  return (
    <Card className="h-full flex flex-col min-h-0">
      <CardHeader>
        <CardTitle>Routing Tables</CardTitle>
        <CardDescription>
          {isSimulating ? 'Live updates from the simulation.' : 'Run simulation to populate tables.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <Accordion type="multiple" className="w-full">
            {nodes.map((node) => (
              <AccordionItem value={node.id} key={node.id}>
                <AccordionTrigger className="font-code hover:no-underline">
                  Router {node.id}
                </AccordionTrigger>
                <AccordionContent>
                  {node.routingTable.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Destination</TableHead>
                          <TableHead>Next Hop</TableHead>
                          <TableHead>Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...node.routingTable].sort((a, b) => a.destination.localeCompare(b.destination)).map((route) => (
                          <TableRow key={`${node.id}-${route.destination}`}>
                            <TableCell className="font-code">{route.destination}</TableCell>
                            <TableCell className="font-code">{route.nextHop}</TableCell>
                            <TableCell className="font-code">{route.cost}</TableCell>
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
            ))}
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
