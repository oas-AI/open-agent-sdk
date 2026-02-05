/**
 * Task tool - Launch a subagent to handle specific tasks
 * Aligned with Claude Agent SDK
 */

import type { Tool, ToolContext, JSONSchema } from '../types/tools';
import type { AgentDefinitions } from '../agent/agent-definition';
import { runSubagent, type SubagentContext } from '../agent/subagent-runner';
import { ToolRegistry } from './registry';
import { HookManager } from '../hooks/manager';
import { logger } from '../utils/logger';

/**
 * Input for the Task tool
 */
export interface TaskInput {
  /** Short task description (3-5 words) */
  description: string;
  /** Full task prompt */
  prompt: string;
  /** Agent type identifier */
  subagent_type: string;
}

/**
 * Output from the Task tool
 * Aligned with Claude Agent SDK TaskOutput
 */
export interface TaskOutput {
  /** Final result message from the subagent (or error description if failed) */
  result: string;
  /** Subagent instance ID */
  agent_id: string;
  /** Token usage statistics */
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  /** Total cost in USD (only if provider supports cost calculation) */
  total_cost_usd?: number;
  /** Execution duration in milliseconds */
  duration_ms: number;
  /** Error details if the subagent failed (optional extension beyond SDK) */
  error?: string;
}

/**
 * Configuration for the Task tool
 */
export interface TaskToolConfig {
  /** Agent definitions keyed by subagent_type */
  agents: AgentDefinitions;
  /** Parent session ID */
  sessionId: string;
  /** Parent's model identifier */
  model: string;
  /** Parent's max turns */
  maxTurns: number;
  /** Parent's permission mode */
  permissionMode: string;
  /** Hook manager for event emission */
  hookManager: HookManager;
  /** Tool registry for filtering */
  toolRegistry: ToolRegistry;
}

// JSON Schema for Task tool parameters
const parameters: JSONSchema = {
  type: 'object',
  properties: {
    description: {
      type: 'string',
      description: 'Short task description (3-5 words)',
    },
    prompt: {
      type: 'string',
      description: 'Full task prompt for the subagent',
    },
    subagent_type: {
      type: 'string',
      description: 'Agent type identifier (must match a key in agents config)',
    },
  },
  required: ['description', 'prompt', 'subagent_type'],
};

/**
 * Task tool implementation
 */
export class TaskTool implements Tool<TaskInput, TaskOutput> {
  name = 'Task';
  description =
    'Launch a specialized subagent to handle a specific task. ' +
    'The subagent operates independently with its own tool set and configuration. ' +
    'Use this to delegate complex tasks like code review, testing, or exploration.';
  parameters = parameters;

  private config: TaskToolConfig;

  constructor(config: TaskToolConfig) {
    this.config = config;
  }

  handler = async (input: TaskInput, context: ToolContext): Promise<TaskOutput> => {
    logger.debug(`[TaskTool] Executing task: ${input.description}`);
    logger.debug(`[TaskTool] Subagent type: ${input.subagent_type}`);

    // Validate that the subagent_type exists in agents config
    const agentDef = this.config.agents[input.subagent_type];
    if (!agentDef) {
      const availableTypes = Object.keys(this.config.agents).join(', ');
      throw new Error(
        `Unknown subagent_type: "${input.subagent_type}". ` +
          `Available types: ${availableTypes || 'none configured'}`
      );
    }

    // Create subagent context
    const subagentContext: SubagentContext = {
      parentContext: context,
      parentToolRegistry: this.config.toolRegistry,
      hookManager: this.config.hookManager,
      parentSessionId: this.config.sessionId,
      parentConfig: {
        model: this.config.model,
        maxTurns: this.config.maxTurns,
        permissionMode: this.config.permissionMode,
      },
    };

    // Execute the subagent
    const result = await runSubagent(agentDef, input.prompt, input.subagent_type, subagentContext);

    logger.debug(`[TaskTool] Task completed: ${input.description}`);
    logger.debug(`[TaskTool] Duration: ${result.durationMs}ms${result.costUsd !== undefined ? `, Cost: $${result.costUsd}` : ''}`);

    return {
      result: result.result,
      agent_id: result.agentId,
      usage: {
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
      },
      ...(result.costUsd !== undefined && { total_cost_usd: result.costUsd }),
      duration_ms: result.durationMs,
      ...(result.error && { error: result.error }),
    };
  };
}

/**
 * Create a Task tool instance
 */
export function createTaskTool(config: TaskToolConfig): TaskTool {
  return new TaskTool(config);
}

/**
 * Create a Task tool with agent definitions from parent config
 * This is a convenience factory for use in ReActLoop
 */
export function createTaskToolFromConfig(
  agents: AgentDefinitions,
  sessionId: string,
  model: string,
  maxTurns: number,
  permissionMode: string,
  hookManager: HookManager,
  toolRegistry: ToolRegistry
): TaskTool {
  return new TaskTool({
    agents,
    sessionId,
    model,
    maxTurns,
    permissionMode,
    hookManager,
    toolRegistry,
  });
}
