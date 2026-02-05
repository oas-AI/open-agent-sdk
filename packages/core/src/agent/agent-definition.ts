/**
 * AgentDefinition types and validation
 * Aligned with Claude Agent SDK
 */

import { z } from 'zod';

/**
 * Permission modes for agent execution
 */
export type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

/**
 * Model identifiers for subagent
 * - 'sonnet' | 'opus' | 'haiku': Specific model presets
 * - 'inherit': Inherit parent agent's model
 */
export type ModelIdentifier = 'sonnet' | 'opus' | 'haiku' | 'inherit';

/**
 * Zod schema for AgentDefinition validation
 */
export const AgentDefinitionSchema = z.object({
  /** Natural language description of when to use this agent */
  description: z.string().min(1, 'description is required'),

  /** List of allowed tools (omit to inherit all from parent) */
  tools: z.array(z.string()).optional(),

  /** System prompt for the agent */
  prompt: z.string().min(1, 'prompt is required'),

  /** Model to use ('inherit' or omit to use parent's model) */
  model: z.enum(['sonnet', 'opus', 'haiku', 'inherit']).optional(),

  /** Maximum turns for the agent (omit to use parent's maxTurns) */
  maxTurns: z.number().int().positive().optional(),

  /** Permission mode (omit to use parent's permissionMode) */
  permissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan']).optional(),
});

/**
 * Agent definition type
 * Defines the configuration for a subagent
 */
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

/**
 * Collection of agent definitions
 * Key is the subagent_type identifier
 */
export type AgentDefinitions = Record<string, AgentDefinition>;

/**
 * Validate an agent definition
 * @param definition The definition to validate
 * @returns The validated definition
 * @throws ZodError if validation fails
 */
export function validateAgentDefinition(definition: unknown): AgentDefinition {
  return AgentDefinitionSchema.parse(definition);
}

/**
 * Safely validate an agent definition
 * @param definition The definition to validate
 * @returns Object with success flag and data or error
 */
export function safeValidateAgentDefinition(
  definition: unknown
): { success: true; data: AgentDefinition } | { success: false; error: z.ZodError } {
  const result = AgentDefinitionSchema.safeParse(definition);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Create a minimal agent definition with required fields
 * @param description When to use this agent
 * @param prompt System prompt for the agent
 * @returns AgentDefinition with required fields
 */
export function createAgentDefinition(
  description: string,
  prompt: string
): AgentDefinition {
  return {
    description,
    prompt,
  };
}

/**
 * Check if an agent definition has custom tools
 * @param definition The agent definition
 * @returns true if tools are explicitly defined
 */
export function hasCustomTools(definition: AgentDefinition): boolean {
  return definition.tools !== undefined;
}

/**
 * Check if an agent definition inherits parent's model
 * @param definition The agent definition
 * @returns true if model is 'inherit' or undefined
 */
export function inheritsModel(definition: AgentDefinition): boolean {
  return definition.model === undefined || definition.model === 'inherit';
}

/**
 * Check if an agent definition has custom maxTurns
 * @param definition The agent definition
 * @returns true if maxTurns is explicitly defined
 */
export function hasCustomMaxTurns(definition: AgentDefinition): boolean {
  return definition.maxTurns !== undefined;
}

/**
 * Check if an agent definition has custom permission mode
 * @param definition The agent definition
 * @returns true if permissionMode is explicitly defined
 */
export function hasCustomPermissionMode(definition: AgentDefinition): boolean {
  return definition.permissionMode !== undefined;
}
