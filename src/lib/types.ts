
export type Algorithm = "rip" | "ospf";

export interface Node {
  id: string;
  x: number;
  y: number;
  routingTable: RipRoutingTable | OspfRoutingTable;
  ospfData?: OspfNodeData;
  // Visualization states
  isUpdating?: boolean; // Flash yellow when table updates
  isVisited?: boolean; // For Dijkstra visualization
  isProcessing?: boolean; // Currently being processed in Dijkstra
}

export interface Edge {
  id:string;
  from: string;
  to: string;
  cost: number;
  bandwidth: number; // in Mbps (for OSPF cost calculation)
  active: boolean;
}

export interface Packet {
  id: string;
  from: string;
  to: string;
  type: 'rip' | 'ospf-lsa' | 'data';
  data: any;
  progress: number; // 0 to 1
  path: {x: number, y: number}[];
}

export type RipRoute = {
  destination: string;
  nextHop: string;
  cost: number;
  // Visualization flag for counting to infinity
  isInfinite?: boolean; // cost >= 16
};

export type RipRoutingTable = {
    [destination: string]: RipRoute;
};

// OSPF Types
export interface OspfRoute {
  destination: string;
  nextHop: string;
  cost: number;
  interface?: string;
}

export type OspfRoutingTable = {
  [destination: string]: OspfRoute;
};

export interface LinkStateAdvertisement {
  routerId: string;
  sequenceNumber: number;
  age: number;
  links: {
    to: string;
    cost: number;
    active: boolean;
  }[];
  timestamp: number;
}

export interface OspfNodeData {
  routerId: string;
  area: string;
  linkStateDatabase: { [routerId: string]: LinkStateAdvertisement };
  neighbors: string[];
  shortestPathTree?: ShortestPathNode[];
}

export interface ShortestPathNode {
  id: string;
  cost: number;
  parent?: string;
  visited: boolean;
}

    