import type { Agent } from '../types.ts';

/**
 * A simple spatial grid for optimizing proximity queries.
 * This helps avoid O(n^2) checks for agent interactions.
 */
export class SpatialGrid {
  private grid: Map<string, Set<string>>;
  private agents: Map<string, Agent>;
  private cellSize: number;

  constructor(cellSize: number) {
    this.grid = new Map();
    this.agents = new Map();
    this.cellSize = cellSize;
  }

  private getKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * Clears the grid for the new frame.
   */
  clear(): void {
    this.grid.clear();
    this.agents.clear();
  }

  /**
   * Inserts an agent into the grid.
   * @param agent The agent to insert.
   */
  insert(agent: Agent): void {
    this.agents.set(agent.id, agent);
    const key = this.getKey(agent.position.left, agent.position.top);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(agent.id);
  }

  /**
   * Queries for agents within a given radius of a point.
   * @param x The x-coordinate of the query center.
   * @param y The y-coordinate of the query center.
   * @param radius The radius to search within.
   * @returns An array of agents found within the radius.
   */
  query(x: number, y: number, radius: number): Agent[] {
    const nearbyAgentIds = new Set<string>();
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        if (this.grid.has(key)) {
          this.grid.get(key)!.forEach(agentId => {
            nearbyAgentIds.add(agentId);
          });
        }
      }
    }

    const result: Agent[] = [];
    const radiusSq = radius * radius;

    nearbyAgentIds.forEach(agentId => {
      const agent = this.agents.get(agentId);
      if (agent) {
        const distSq = Math.pow(x - agent.position.left, 2) + Math.pow(y - agent.position.top, 2);
        if (distSq <= radiusSq) {
          result.push(agent);
        }
      }
    });

    return result;
  }
}
