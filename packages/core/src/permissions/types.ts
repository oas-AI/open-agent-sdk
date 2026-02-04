/**
 * Permission system types
 * Aligned with Claude Agent SDK
 */

/**
 * Permission mode for controlling tool execution behavior
 */
export type PermissionMode =
  | 'default'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'plan';

/**
 * Options for configuring permission behavior
 */
export interface PermissionOptions {
  /** Current permission mode */
  mode: PermissionMode;
  /** Required to be true when using bypassPermissions mode */
  allowDangerouslySkipPermissions?: boolean;
  /** Custom callback for tool permission checks */
  canUseTool?: CanUseTool;
}

/**
 * Result from a custom permission check callback
 */
export type PermissionResult =
  | {
      /** Allow the tool to execute */
      behavior: 'allow';
      /** Input to use (may be modified from original) */
      updatedInput: Record<string, unknown>;
    }
  | {
      /** Deny the tool execution */
      behavior: 'deny';
      /** Message explaining why (shown to LLM) */
      message: string;
    };

/**
 * Custom permission check callback
 * Called when a sensitive tool needs permission verification
 */
export type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  context: { signal: AbortSignal }
) => Promise<PermissionResult>;

/**
 * Result from PermissionManager.checkPermission()
 */
export interface PermissionCheckResult {
  /** Whether the tool is approved for execution */
  approved: boolean;
  /** Modified input (if any) */
  updatedInput?: Record<string, unknown>;
  /** Error message if denied */
  error?: string;
}

/**
 * Entry in the plan log (used in plan mode)
 */
export interface PlanLogEntry {
  /** Name of the tool that was called */
  toolName: string;
  /** Input parameters */
  input: Record<string, unknown>;
  /** Timestamp of the call */
  timestamp: number;
}

/**
 * Sensitive tools that require permission confirmation in default mode
 */
export const SENSITIVE_TOOLS = ['Bash', 'Write', 'Edit', 'WebSearch', 'WebFetch'];

/**
 * Edit tools that are auto-approved in acceptEdits mode
 */
export const EDIT_TOOLS = ['Write', 'Edit'];

/**
 * Check if a tool is a sensitive tool
 */
export function isSensitiveTool(toolName: string): boolean {
  return SENSITIVE_TOOLS.includes(toolName);
}

/**
 * Check if a tool is an edit tool
 */
export function isEditTool(toolName: string): boolean {
  return EDIT_TOOLS.includes(toolName);
}
