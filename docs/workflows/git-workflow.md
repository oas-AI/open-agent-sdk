# Git Workflow Guide

## Overview

This project uses **git worktrees** for isolated feature development and follows **conventional commits** for clear history.

## Git Worktree Workflow

### Why Worktrees?

- **Isolation**: Work on multiple features without switching branches
- **Safety**: Avoid accidentally committing to wrong branch
- **Cleanliness**: Keep main workspace clean during experiments

### Creating a Worktree

```bash
# Create worktree with new branch
git worktree add .worktrees/<feature-name> -b <branch-name>
cd .worktrees/<feature-name>

# Example
git worktree add .worktrees/add-oauth-support -b feat/oauth-provider
cd .worktrees/add-oauth-support
```

**In Claude Code:** Use `EnterWorktree` tool for automatic setup.

### Working in Worktree

```bash
# Normal git operations work as expected
git status
git add <files>
git commit -m "feat(auth): add OAuth provider"
git push -u origin feat/oauth-provider
```

### Cleaning Up After PR Merge

```bash
# Return to main workspace
cd /path/to/open-agent-sdk

# Remove worktree
git worktree remove .worktrees/<feature-name>

# Delete local branch (optional, keeps history)
git branch -d <branch-name>
```

### Listing Active Worktrees

```bash
# See all worktrees
git worktree list

# Remove stale worktrees
git worktree prune
```

## Branch Management

### Branch Naming Convention

- `feat/<description>` - New features
- `fix/<description>` - Bug fixes
- `refactor/<description>` - Code refactoring
- `docs/<description>` - Documentation updates
- `test/<description>` - Test improvements
- `chore/<description>` - Maintenance tasks

### Never Work on Main Branch

- ❌ **Bad**: `git checkout main && git commit`
- ✅ **Good**: Always create a feature branch

### Before Creating a PR

**Check if branch already has a PR:**

```bash
# Check specific branch
gh pr view <branch-name> --json state,mergedAt,number,title

# List all PRs for branch
gh pr list --head <branch-name> --state all
```

### Never Push to Merged Branches

**Rule**: If a branch already has a merged PR, create a new branch instead.

```bash
# Check if PR is merged
gh pr view feat/my-feature --json mergedAt
# Output: {"mergedAt": "2024-02-27T08:53:25Z"}  ← PR is merged!

# ❌ Bad: Push more commits to merged branch
git push origin feat/my-feature

# ✅ Good: Create new branch from main
git checkout main
git pull origin main
git worktree add .worktrees/continue-work -b feat/my-feature-v2
```

## Commit Standards

### Conventional Commits Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring (no behavior change)
- `test` - Add or update tests
- `docs` - Documentation changes
- `chore` - Maintenance (deps, config, etc.)
- `perf` - Performance improvement
- `style` - Code style changes (formatting, etc.)

### Examples

```bash
# Feature
git commit -m "feat(tools): add WebSearch tool implementation"

# Bug fix
git commit -m "fix(agent): handle empty tool responses correctly"

# Refactoring
git commit -m "refactor(providers): extract common retry logic"

# Tests
git commit -m "test(permissions): add edge case tests for deny rules"

# Documentation
git commit -m "docs(readme): update installation instructions"
```

### Incremental Commits

**❌ Bad**: Complete entire feature → single commit

```bash
# Avoid this
git add .
git commit -m "feat(auth): add OAuth support"
# (1000+ lines changed)
```

**✅ Good**: Break work into logical steps

```bash
# Step 1: Add types
git add src/types/oauth.ts
git commit -m "feat(auth): add OAuth provider types"

# Step 2: Implement provider
git add src/providers/oauth.ts
git commit -m "feat(auth): implement OAuth provider"

# Step 3: Add tests
git add tests/providers/oauth.test.ts
git commit -m "test(auth): add OAuth provider tests"

# Step 4: Update docs
git add README.md
git commit -m "docs(auth): document OAuth provider usage"
```

### Commit Guidelines

- **Frequency**: Commit after each logical unit of work
- **Self-contained**: Each commit should pass tests
- **Atomic**: One concern per commit
- **Clear messages**: Describe what and why, not how

## Pull Request Guidelines

### PR Title Format

Follow conventional commits format:

```
<type>(<scope>): <description>

Examples:
feat(tools): add Task tool for spawning subagents
fix(tests): resolve Google provider abort test flakiness
refactor(agent): simplify ReAct loop error handling
```

### PR Description Template

```markdown
## Summary
Brief overview of changes (1-2 sentences)

## Changes
- Bullet list of key changes
- Include file paths if helpful

## Metrics (if applicable)
- Test coverage: 85% → 92%
- Bundle size: +2KB

## Verification Checklist
- [ ] Tests pass locally
- [ ] No TypeScript errors
- [ ] Coverage > 80%
- [ ] Documentation updated
```

### PR Language

- **All PR content must be in English**
- Title, description, comments, commit messages

### PR Scope

- **Keep PRs focused**: One logical change per PR
- **Avoid stacking**: Don't add unrelated changes after initial review
- **Split large PRs**: Break into multiple smaller PRs when possible

## Workflow for Continuing Work After PR Merge

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create new worktree with new branch
git worktree add .worktrees/<new-feature> -b <new-branch-name>
cd .worktrees/<new-feature>

# 3. Start working
# ... make changes ...
git commit -m "feat: ..."
git push -u origin <new-branch-name>
```

## Troubleshooting

### Worktree Directory Already Exists

```bash
# Remove stale worktree reference
git worktree prune

# Force remove if directory exists
git worktree remove --force .worktrees/<feature-name>
```

### Branch Tracking Wrong Remote

```bash
# Set upstream branch
git branch --set-upstream-to=origin/<branch-name>
```

### Accidentally Committed to Main

```bash
# Create branch from current state
git branch feat/my-changes

# Reset main to origin
git checkout main
git reset --hard origin/main

# Switch to new branch
git checkout feat/my-changes
```

## Quick Reference

```bash
# Create worktree
git worktree add .worktrees/<name> -b <branch>

# List worktrees
git worktree list

# Remove worktree
git worktree remove .worktrees/<name>

# Check PR status
gh pr view <branch> --json state,mergedAt

# Conventional commit
git commit -m "<type>(<scope>): <description>"
```
