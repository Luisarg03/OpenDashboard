from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from . import db
from .config import TEMPLATES_DIR
from .models import build_tree

router = APIRouter()
templates = Jinja2Templates(directory=TEMPLATES_DIR)


@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    search: str = "",
    agent: str = "",
):
    try:
        projects = db.list_projects()
        sessions = db.list_sessions(
            limit=100,
            search=search or None,
            agent=agent or None,
        )
        root_sessions = db.list_root_sessions(
            limit=50,
            search=search or None,
            agent=agent or None,
        )
        agents = db.list_agents()
        stats = db.get_dashboard_stats()

        # Preload first root's delegation map so map-panel isn't empty
        first_map = None
        if root_sessions:
            first_root = root_sessions[0]
            nodes = db.get_delegation_chain(first_root.id)
            first_map = {
                "session": first_root,
                "tree": build_tree(nodes),
                "total_cost": sum(n.cost for n in nodes),
                "total_tokens": sum(n.tokens_input + n.tokens_output for n in nodes),
            }

        return templates.TemplateResponse(
            request,
            "index.html",
            {
                "request": request,
                "projects": projects,
                "sessions": sessions,
                "root_sessions": root_sessions,
                "agents": agents,
                "stats": stats,
                "search": search,
                "agent": agent,
                "first_map": first_map,
            },
        )
    except FileNotFoundError as e:
        return templates.TemplateResponse(
            request,
            "error.html",
            {"request": request, "error": str(e)},
        )


@router.get("/project/{project_id}", response_class=HTMLResponse)
async def project_sessions(
    request: Request,
    project_id: str,
    search: str = "",
    agent: str = "",
):
    sessions = db.list_sessions(
        project_id=project_id,
        limit=200,
        search=search or None,
        agent=agent or None,
    )
    agents = db.list_agents()
    return templates.TemplateResponse(
        request,
        "session_list.html",
        {
            "request": request,
            "sessions": sessions,
            "project_id": project_id,
            "agents": agents,
            "search": search,
            "agent": agent,
        },
    )


@router.get("/session/{session_id}", response_class=HTMLResponse)
async def session_detail(request: Request, session_id: str):
    session = db.get_session_by_id(session_id)
    if not session:
        return HTMLResponse("Session not found", status_code=404)

    nodes = db.get_delegation_chain(session_id)
    tree = build_tree(nodes)

    is_htmx = request.headers.get("hx-request") == "true"
    template = "_session_detail_body.html" if is_htmx else "session_detail.html"

    return templates.TemplateResponse(
        request,
        template,
        {
            "request": request,
            "session": session,
            "tree": tree,
            "total_cost": sum(n.cost for n in nodes),
            "total_tokens": sum(n.tokens_input + n.tokens_output for n in nodes),
            "is_htmx": is_htmx,
        },
    )


@router.get("/session/{session_id}/tree", response_class=HTMLResponse)
async def session_tree_partial(request: Request, session_id: str):
    nodes = db.get_delegation_chain(session_id)
    tree = build_tree(nodes)
    return templates.TemplateResponse(
        request,
        "tree.html",
        {"request": request, "tree": tree},
    )


@router.get("/session/{session_id}/map", response_class=HTMLResponse)
async def session_map_partial(request: Request, session_id: str):
    """Partial endpoint: returns focused delegation map for main panel."""
    session = db.get_session_by_id(session_id)
    if not session:
        return HTMLResponse("Session not found", status_code=404)

    nodes = db.get_delegation_chain(session_id)
    tree = build_tree(nodes)

    return templates.TemplateResponse(
        request,
        "_session_map.html",
        {
            "request": request,
            "session": session,
            "tree": tree,
            "total_cost": sum(n.cost for n in nodes),
            "total_tokens": sum(n.tokens_input + n.tokens_output for n in nodes),
        },
    )
