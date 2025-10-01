
export type Algorithm = "rip" | "ospf";

export interface Node {
  id: string;
  x: number;
  y: number;
  routingTable: RipRoutingTable | OspfRoutingTable;
  ospfData?: OspfNodeData;
}

export interface Edge {
  id:string;
  from: string;
  to: string;
  cost: number;
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

    