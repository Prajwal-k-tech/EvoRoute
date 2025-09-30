export type Algorithm = "rip" | "ospf";

export interface Node {
  id: string;
  x: number;
  y: number;
  routingTable: RipRoutingTable;
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

export type RipRoutingTable = RipRoute[];
