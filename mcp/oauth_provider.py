"""
Persistent OAuth provider for LogbookLM MCP servers.

Subclasses InMemoryOAuthProvider and adds JSON file persistence so that
registered clients and issued tokens survive server restarts.

Auth codes are intentionally NOT persisted — they are short-lived (5 min),
single-use, and safe to lose across restarts.
"""

import json
import threading
from pathlib import Path

from fastmcp.server.auth.providers.in_memory import InMemoryOAuthProvider
from mcp.server.auth.provider import AccessToken, AuthorizationCode, RefreshToken
from mcp.server.auth.settings import ClientRegistrationOptions
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken


class PersistentOAuthProvider(InMemoryOAuthProvider):
    """InMemoryOAuthProvider that persists clients and tokens to a JSON file.

    This prevents the "client not found" / "token not found" errors that occur
    when the server restarts and InMemoryOAuthProvider loses all state.
    """

    def __init__(self, state_file: Path, **kwargs):
        super().__init__(**kwargs)
        self.state_file = state_file
        self._lock = threading.Lock()
        self._load_state()

    # ------------------------------------------------------------------
    # Persistence helpers
    # ------------------------------------------------------------------

    def _load_state(self) -> None:
        if not self.state_file.exists():
            return
        try:
            data = json.loads(self.state_file.read_text())

            for raw in data.get("clients", {}).values():
                obj = OAuthClientInformationFull.model_validate(raw)
                self.clients[obj.client_id] = obj

            for raw in data.get("access_tokens", {}).values():
                obj = AccessToken.model_validate(raw)
                self.access_tokens[obj.token] = obj

            for raw in data.get("refresh_tokens", {}).values():
                obj = RefreshToken.model_validate(raw)
                self.refresh_tokens[obj.token] = obj

            self._access_to_refresh_map = data.get("access_to_refresh", {})
            self._refresh_to_access_map = data.get("refresh_to_access", {})

        except Exception as exc:
            # Corrupted state file — start fresh rather than crashing.
            print(f"[PersistentOAuthProvider] Could not load state from {self.state_file}: {exc}")

    def _save_state(self) -> None:
        data = {
            "clients": {k: v.model_dump(mode="json") for k, v in self.clients.items()},
            "access_tokens": {k: v.model_dump(mode="json") for k, v in self.access_tokens.items()},
            "refresh_tokens": {k: v.model_dump(mode="json") for k, v in self.refresh_tokens.items()},
            "access_to_refresh": self._access_to_refresh_map,
            "refresh_to_access": self._refresh_to_access_map,
        }
        with self._lock:
            self.state_file.write_text(json.dumps(data, indent=2))

    # ------------------------------------------------------------------
    # Overrides that add persistence after each state-mutating operation
    # ------------------------------------------------------------------

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        await super().register_client(client_info)
        self._save_state()

    async def exchange_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: AuthorizationCode
    ) -> OAuthToken:
        result = await super().exchange_authorization_code(client, authorization_code)
        self._save_state()
        return result

    async def exchange_refresh_token(
        self,
        client: OAuthClientInformationFull,
        refresh_token: RefreshToken,
        scopes: list[str],
    ) -> OAuthToken:
        result = await super().exchange_refresh_token(client, refresh_token, scopes)
        self._save_state()
        return result

    async def revoke_token(self, token: AccessToken | RefreshToken) -> None:
        await super().revoke_token(token)
        self._save_state()
