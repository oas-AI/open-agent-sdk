/**
 * ToolManager - Manages tool call states and lifecycle
 */

export type ToolStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ToolCallState {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolStatus;
  result?: unknown;
  error?: string;
  startTime?: number;
  endTime?: number;
  expanded: boolean;
}

export class ToolManager {
  private tools: Map<string, ToolCallState> = new Map();

  /**
   * Add a new tool call
   */
  addTool(id: string, name: string, args: Record<string, unknown>): void {
    this.tools.set(id, {
      id,
      name,
      args,
      status: 'pending',
      expanded: false,
    });
  }

  /**
   * Get a tool by ID
   */
  getTool(id: string): ToolCallState | undefined {
    return this.tools.get(id);
  }

  /**
   * Get all tools as an array
   */
  getTools(): ToolCallState[] {
    return Array.from(this.tools.values());
  }

  /**
   * Update the status of a tool
   */
  updateToolStatus(id: string, status: ToolStatus): void {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool with ID ${id} not found`);
    }

    tool.status = status;

    if (status === 'running' && !tool.startTime) {
      tool.startTime = Date.now();
    }

    if (status === 'completed' || status === 'failed') {
      tool.endTime = Date.now();
    }
  }

  /**
   * Set the result for a tool
   */
  setToolResult(id: string, result: unknown): void {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool with ID ${id} not found`);
    }

    tool.result = result;
  }

  /**
   * Set an error for a tool
   */
  setToolError(id: string, error: string): void {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool with ID ${id} not found`);
    }

    tool.error = error;
    tool.status = 'failed';
    tool.endTime = Date.now();
  }

  /**
   * Toggle the expanded state of a tool
   */
  toggleExpanded(id: string): void {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool with ID ${id} not found`);
    }

    tool.expanded = !tool.expanded;
  }

  /**
   * Get the duration of a tool execution in seconds
   */
  getDuration(id: string): number | undefined {
    const tool = this.tools.get(id);
    if (!tool || !tool.startTime) {
      return undefined;
    }

    const endTime = tool.endTime || Date.now();
    return (endTime - tool.startTime) / 1000;
  }

  /**
   * Check if any tools are currently running
   */
  hasRunningTools(): boolean {
    for (const tool of this.tools.values()) {
      if (tool.status === 'running') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the count of tools by status
   */
  getStatusCount(): { pending: number; running: number; completed: number; failed: number } {
    const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const tool of this.tools.values()) {
      counts[tool.status]++;
    }
    return counts;
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}
