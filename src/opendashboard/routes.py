from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from . import db
from .config import TEMPLATES_DIR
from .models import build_tree

router = APIRouter()
templates = Jinja2Templates(directory=TEMPLATES_DIR)


def compute_trace_summary(nodes):
    """Compute aggregate summary from delegation chain nodes."""
    if not nodes:
        return {
            "total_tasks": 0,
            "total_cost": 0.0,
            "total_tokens": 0,
            "completed_count": 0,
            "running_count": 0,
            "failed_count": 0,
            "duration_minutes": 0,
        }

    total_tasks = len(nodes)
    total_cost = sum(n.cost for n in nodes)
    total_tokens = sum(n.tokens_input + n.tokens_output for n in nodes)

    # Determine leaf nodes (ids not referenced as parent_id among these nodes)
    parent_ids = {n.parent_id for n in nodes if n.parent_id}
    all_ids = {n.id for n in nodes}
    leaf_ids = all_ids - parent_ids

    latest_time = max(n.time_created for n in nodes)
    earliest_time = min(n.time_created for n in nodes)

    # Running = leaf with latest time_created
    running_count = sum(
        1 for n in nodes if n.id in leaf_ids and n.time_created == latest_time
    )
    failed_count = 0
    completed_count = total_tasks - running_count - failed_count

    duration_minutes = max(0, (latest_time - earliest_time) // 60000)

    return {
        "total_tasks": total_tasks,
        "total_cost": total_cost,
        "total_tokens": total_tokens,
        "completed_count": completed_count,
        "running_count": running_count,
        "failed_count": failed_count,
        "duration_minutes": duration_minutes,
    }


@router.get("/", response_class=HTMLResponse)
async def index(
    request: Request,
    search: str = "",
    agent: str = "",
):
    try:
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
            earliest_time = min(n.time_created for n in nodes) if nodes else 0
            latest_time = max(n.time_created for n in nodes) if nodes else 0
            first_map = {
                "session": first_root,
                "tree": build_tree(nodes),
                "total_cost": sum(n.cost for n in nodes),
                "total_tokens": sum(n.tokens_input + n.tokens_output for n in nodes),
                "earliest_time": earliest_time,
                "latest_time": latest_time,
                "trace_summary": compute_trace_summary(nodes),
            }

        return templates.TemplateResponse(
            request,
            "index.html",
            {
                "request": request,
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

    earliest_time = min(n.time_created for n in nodes) if nodes else 0
    latest_time = max(n.time_created for n in nodes) if nodes else 0

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
            "earliest_time": earliest_time,
            "latest_time": latest_time,
            "trace_summary": compute_trace_summary(nodes),
            "is_htmx": is_htmx,
        },
    )


@router.get("/session/{session_id}/tree", response_class=HTMLResponse)
async def session_tree_partial(request: Request, session_id: str):
    nodes = db.get_delegation_chain(session_id)
    tree = build_tree(nodes)
    earliest_time = min(n.time_created for n in nodes) if nodes else 0
    latest_time = max(n.time_created for n in nodes) if nodes else 0
    return templates.TemplateResponse(
        request,
        "tree.html",
        {
            "request": request,
            "tree": tree,
            "earliest_time": earliest_time,
            "latest_time": latest_time,
            "trace_summary": compute_trace_summary(nodes),
        },
    )


@router.get("/session/{session_id}/map", response_class=HTMLResponse)
async def session_map_partial(request: Request, session_id: str):
    """Partial endpoint: returns focused delegation map for main panel."""
    session = db.get_session_by_id(session_id)
    if not session:
        return HTMLResponse("Session not found", status_code=404)

    nodes = db.get_delegation_chain(session_id)
    tree = build_tree(nodes)

    earliest_time = min(n.time_created for n in nodes) if nodes else 0
    latest_time = max(n.time_created for n in nodes) if nodes else 0

    return templates.TemplateResponse(
        request,
        "_session_map.html",
        {
            "request": request,
            "session": session,
            "tree": tree,
            "total_cost": sum(n.cost for n in nodes),
            "total_tokens": sum(n.tokens_input + n.tokens_output for n in nodes),
            "earliest_time": earliest_time,
            "latest_time": latest_time,
            "trace_summary": compute_trace_summary(nodes),
        },
    )
