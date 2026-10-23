"""Worker entry point — starts all worker processes."""

import asyncio
import os

from .indexing_worker import register as register_indexing
from .journal_worker import register as register_journal
from .memory_worker import register as register_memory
from .outbox_poller import OutboxPoller


async def main():
    poll_interval = int(os.getenv("AI_WORKER_POLL_INTERVAL", "5"))
    poller = OutboxPoller(poll_interval=poll_interval)

    register_indexing(poller)
    register_memory(poller)
    register_journal(poller)

    await poller.start()


if __name__ == "__main__":
    asyncio.run(main())
