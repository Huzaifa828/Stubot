import asyncio
import threading
import sys


def run_async_in_new_thread(coro):
    """
    Runs an async coroutine in a completely separate thread with its own
    fresh event loop. Needed on Windows because uvicorn's main event loop
    (via Python 3.12+'s Runner/loop_factory) bypasses the event loop
    policy, staying on SelectorEventLoop — which doesn't support
    subprocess creation, breaking Playwright's async API.

    Running in a separate thread with a manually created event loop
    sidesteps this entirely.
    """
    result = {}
    exception = {}

    def runner():
        if sys.platform == "win32":
            loop = asyncio.ProactorEventLoop()
        else:
            loop = asyncio.new_event_loop()

        asyncio.set_event_loop(loop)
        try:
            result['value'] = loop.run_until_complete(coro)
        except Exception as e:
            exception['error'] = e
        finally:
            loop.close()

    thread = threading.Thread(target=runner)
    thread.start()
    thread.join()

    if 'error' in exception:
        raise exception['error']

    return result.get('value')