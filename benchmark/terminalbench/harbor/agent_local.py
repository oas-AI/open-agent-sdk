"""
open-agent-sdk Harbor Agent Adapter (Local Development)

This is a variant of the standard OpenAgentSDKAgent that installs from
local source code instead of npm packages. Use this for testing before
publishing to npm.

Usage:
    # Register agent
    ln -sf $(pwd)/benchmark/terminalbench/harbor/agent_local.py \
      $(python -c "import harbor; print(harbor.__path__[0])")/agents/installed/open_agent_sdk_local.py

    # Run with MiniMax
    export ANTHROPIC_AUTH_TOKEN=your_token
    export ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic/v1
    harbor jobs start \
      --path benchmark/terminalbench/test-tasks/hello-world \
      --agent-import-path "harbor.agents.installed.open_agent_sdk_local:OpenAgentSDKAgentLocal" \
      --model MiniMax-M2.5
"""

from pathlib import Path

from harbor.agents.installed.open_agent_sdk import OpenAgentSDKAgent


class OpenAgentSDKAgentLocal(OpenAgentSDKAgent):
    """
    Local development variant of OpenAgentSDKAgent.
    Installs from GitHub repository instead of npm.
    """

    @staticmethod
    def name() -> str:
        return "open-agent-sdk-local"

    def version(self) -> str | None:
        return "local-dev"

    @property
    def _install_agent_template_path(self) -> Path:
        """Override to use local installation script."""
        return Path(__file__).parent / "install-open-agent-sdk-local.sh.j2"
