/**
 * Subagent runner - manages the execution of child agents
 * Aligned with Claude Agent SDK
 */

import type { AgentDefinition } from './agent-definition';
import type { Tool, ToolContext } from '../types/tools';
import type { ToolRegistry } from '../tools/registry';
import { ReActLoop, type ReActLoopConfig } from './react-loop';
import { HookManager } from '../hooks/manager';
import { createSubagentStartInput, createSubagentStopInput } from '../hooks/inputs';
import { logger } from '../utils/logger';

/**
 * Result from subagent execution
 */
export interface SubagentResult {
  /** Final result message (or error description if failed) */
  result: string;
  /** Unique identifier for the subagent instance */
  agentId: string;
  /** Token usage statistics */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  /** Cost in USD (only if provider supports cost calculation) */
  costUsd?: number;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Error details if execution failed (optional) */
  error?: string;
}

/**
 * Context for subagent execution
 */
export interface SubagentContext {
  /** Parent tool context */
  parentContext: ToolContext;
  /** Parent's tool registry */
  parentToolRegistry: ToolRegistry;
  /** Hook manager for emitting events */
  hookManager: HookManager;
  /** Parent session ID */
  parentSessionId: string;
  /** Parent's configuration values to inherit from */
  parentConfig: {
    model: string;
    maxTurns: number;
    permissionMode: string;
    allowedTools?: string[];
  };
}

/**
 * Generate a unique agent ID
 */
function generateAgentId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a filtered tool registry based on agent definition
 * If tools is undefined, returns all parent tools
 * If tools is specified, returns only those tools
 */
function getAllowedTools(
  agentDef: AgentDefinition,
  parentToolRegistry: ToolRegistry
): Tool[] {
  if (agentDef.tools === undefined) {
    // Inherit all tools from parent
    return parentToolRegistry.getAll();
  }
  // Use specified tools only
  return parentToolRegistry.getAllowedTools(agentDef.tools);
}

/**
 * Determine effective model for subagent
 * Returns parent's model if agentDef.model is undefined or 'inherit'
 */
function getEffectiveModel(agentDef: AgentDefinition, parentModel: string): string {
  if (agentDef.model === undefined || agentDef.model === 'inherit') {
    return parentModel;
  }
  return agentDef.model;
}

/**
 * Determine effective maxTurns for subagent
 * Returns parent's maxTurns if agentDef.maxTurns is undefined
 */
function getEffectiveMaxTurns(agentDef: AgentDefinition, parentMaxTurns: number): number {
  return agentDef.maxTurns ?? parentMaxTurns;
}

/**
 * Determine effective permission mode for subagent
 * Returns parent's permissionMode if agentDef.permissionMode is undefined
 */
function getEffectivePermissionMode(
  agentDef: AgentDefinition,
  parentPermissionMode: string
): string {
  return agentDef.permissionMode ?? parentPermissionMode;
}


/**
 * Run a subagent with the given configuration
 *
 * @param agentDef - Agent definition
 * @param prompt - Task prompt for the subagent
 * @param agentType - Type identifier for the subagent
 * @param context - Execution context
 * @returns Subagent execution result
 */
export async function runSubagent(
  agentDef: AgentDefinition,
  prompt: string,
  agentType: string,
  context: SubagentContext
): Promise<SubagentResult> {
  const startTime = Date.now();
  const agentId = generateAgentId();
  const cwd = context.parentContext.cwd;

  logger.debug(`[SubagentRunner] Starting subagent ${agentId} of type ${agentType}`);

  try {
    // Trigger SubagentStart hook
    const subagentStartInput = createSubagentStartInput(
      context.parentSessionId,
      cwd,
      agentId,
      agentType,
      prompt,
      undefined,
      context.parentConfig.permissionMode
    );

    await context.hookManager.emit('SubagentStart', subagentStartInput, undefined);

    // Get effective configuration
    const effectiveModel = getEffectiveModel(agentDef, context.parentConfig.model);
    const effectiveMaxTurns = getEffectiveMaxTurns(agentDef, context.parentConfig.maxTurns);
    const effectivePermissionMode = getEffectivePermissionMode(
      agentDef,
      context.parentConfig.permissionMode
    );

    // Get allowed tools
    const allowedTools = getAllowedTools(agentDef, context.parentToolRegistry);

    logger.debug(`[SubagentRunner] Subagent ${agentId} config:`, {
      model: effectiveModel,
      maxTurns: effectiveMaxTurns,
      permissionMode: effectivePermissionMode,
      toolCount: allowedTools.length,
    });

    // Create subagent configuration
    const subagentConfig: ReActLoopConfig = {
      maxTurns: effectiveMaxTurns,
      systemPrompt: agentDef.prompt,
      allowedTools: allowedTools.map(t => t.name),
      cwd,
      env: context.parentContext.env,
      abortController: context.parentContext.abortController,
      permissionMode: effectivePermissionMode as any,
      // Subagent has its own hooks (not inherited from parent)
      hooks: new HookManager(),
    };

    // Create and run the subagent
    // Note: We need a provider instance. If parent's context has one, use it.
    if (!context.parentContext.provider) {
      throw new Error('Provider not available in parent context');
    }

    const subagent = new ReActLoop(
      context.parentContext.provider,
      // Create a new tool registry with filtered tools
      // This is a simplified approach - in reality we might need to create a new registry
      context.parentToolRegistry,
      subagentConfig,
      agentId
    );

    const result = await subagent.run(prompt);
    const durationMs = Date.now() - startTime;

    logger.debug(`[SubagentRunner] Subagent ${agentId} completed in ${durationMs}ms`);

    // Trigger SubagentStop hook
    const subagentStopInput = createSubagentStopInput(
      context.parentSessionId,
      cwd,
      false, // stopHookActive
      undefined,
      context.parentConfig.permissionMode
    );

    await context.hookManager.emit('SubagentStop', subagentStopInput, undefined);

    // Calculate cost if provider supports it
    const provider = context.parentContext.provider;
    const costUsd = provider.getCost?.({
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
    });

    // Check if execution resulted in an error (based on ReActLoop's isError flag)
    const hasError = result.isError ?? false;

    return {
      result: result.result,
      agentId,
      usage: {
        inputTokens: result.usage.input_tokens,
        outputTokens: result.usage.output_tokens,
      },
      costUsd,
      durationMs,
      ...(hasError && { error: result.result }),
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`[SubagentRunner] Subagent ${agentId} failed:`, errorMessage);

    // Trigger SubagentStop hook even on failure
    try {
      const subagentStopInput = createSubagentStopInput(
        context.parentSessionId,
        cwd,
        false,
        undefined,
        context.parentConfig.permissionMode
      );
      await context.hookManager.emit('SubagentStop', subagentStopInput, undefined);
    } catch (hookError) {
      // Ignore hook errors during cleanup
      logger.warn('[SubagentRunner] Failed to emit SubagentStop hook:', hookError);
    }

    return {
      result: `Error: ${errorMessage}`,
      agentId,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
      durationMs,
      error: errorMessage,
    };
  }
}

/**
 * Helper to check if a subagent result indicates success
 */
export function isSubagentSuccess(result: SubagentResult): boolean {
  return result.error === undefined;
}

/**
 * Helper to format subagent result for display
 */
export function formatSubagentResult(result: SubagentResult): string {
  const status = result.error !== undefined ? 'FAILED' : 'SUCCESS';
  return `[${status}] ${result.agentId}: ${result.result.substring(0, 100)}${
    result.result.length > 100 ? '...' : ''
  }`;
}
