/**
 * Skill registry module
 *
 * This module provides a registry for managing loaded skills,
 * including loading, querying, and organizing skills.
 */

import type {
  SkillRegistry,
  SkillDefinition,
  SkillCatalogItem,
  SkillLoaderOptions,
} from './types';
import { SkillLoader } from './loader';

/**
 * Create a new skill registry instance
 *
 * @param options - Optional loader configuration
 * @returns SkillRegistry instance
 */
export function createSkillRegistry(options?: SkillLoaderOptions): SkillRegistry {
  return new SkillRegistryImpl(options);
}

/**
 * Skill registry implementation
 */
class SkillRegistryImpl implements SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private loader: SkillLoader;

  /**
   * Create a new SkillRegistryImpl instance
   *
   * @param options - Optional loader configuration
   */
  constructor(options?: SkillLoaderOptions) {
    this.loader = new SkillLoader(options);
  }

  /**
   * Load all skills from configured sources
   *
   * @returns Array of loaded skill definitions
   */
  async loadAll(): Promise<SkillDefinition[]> {
    const loadedSkills = await this.loader.loadAll();

    // Clear existing skills before loading new ones
    this.skills.clear();

    // Add loaded skills to registry
    for (const skill of loadedSkills) {
      const name = skill.frontmatter.name;

      // Handle duplicates: project skills take precedence over personal
      if (this.skills.has(name)) {
        const existing = this.skills.get(name)!;
        if (skill.source === 'project' && existing.source === 'personal') {
          this.skills.set(name, skill);
        }
      } else {
        this.skills.set(name, skill);
      }
    }

    return Array.from(this.skills.values());
  }

  /**
   * Get catalog of all available skills (lightweight)
   *
   * @returns Array of skill catalog items
   */
  getAll(): SkillCatalogItem[] {
    const catalog: SkillCatalogItem[] = [];

    for (const skill of this.skills.values()) {
      catalog.push({
        name: skill.frontmatter.name,
        description: skill.frontmatter.description,
        source: skill.source,
      });
    }

    // Sort by name for consistent ordering
    catalog.sort((a, b) => a.name.localeCompare(b.name));

    return catalog;
  }

  /**
   * Get a specific skill by name
   *
   * @param name - Skill name
   * @returns Skill definition or undefined if not found
   */
  get(name: string): SkillDefinition | undefined {
    return this.skills.get(name);
  }

  /**
   * Check if a skill exists
   *
   * @param name - Skill name
   * @returns True if skill exists
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * Clear all loaded skills
   */
  clear(): void {
    this.skills.clear();
  }
}

// Also export the class for advanced use cases
export { SkillRegistryImpl as SkillRegistry };
