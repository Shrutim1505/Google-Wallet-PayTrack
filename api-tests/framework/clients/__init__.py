"""Domain API clients used by tests and fixtures."""

from framework.clients.auth_client import AuthClient
from framework.clients.health_client import HealthClient
from framework.clients.receipts_client import ReceiptsClient

__all__ = ["AuthClient", "HealthClient", "ReceiptsClient"]
