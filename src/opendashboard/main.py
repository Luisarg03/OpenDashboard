import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import APP_HOST, APP_PORT, APP_TITLE, STATIC_DIR
from .filters import register_template_filters
from .routes import router, templates


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: register template filters before first request."""
    register_template_filters(templates)
    yield


app = FastAPI(title=APP_TITLE, lifespan=lifespan)
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.include_router(router)


def main():
    """Start the OpenDashboard server."""
    from .config import DB_PATH

    print(f"OpenDashboard starting at http://{APP_HOST}:{APP_PORT}")
    print(f"DB: {DB_PATH}")
    uvicorn.run(app, host=APP_HOST, port=APP_PORT, log_level="info")


if __name__ == "__main__":
    main()
