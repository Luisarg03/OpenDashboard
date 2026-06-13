from pydantic import BaseModel
from typing import Optional


class TokenUsageMixin(BaseModel):
    """Shared token usage statistics fields."""
    cost: float = 0
    tokens_input: int = 0
    tokens_output: int = 0
    tokens_reasoning: int = 0
    tokens_cache_read: int = 0
    tokens_cache_write: int = 0


def model_from_row(model_cls, row: dict):
    """Construct a model instance from a database row dict."""
    return model_cls(**{k: row[k] for k in model_cls.model_fields if k in row})


class SessionSummary(TokenUsageMixin):
    id: str
    parent_id: Optional[str] = None
    project_id: str
    agent: str
    model: Optional[str] = None
    title: str
    time_created: int
    time_updated: int

    @classmethod
    def from_row(cls, row: dict) -> "SessionSummary":
        return model_from_row(cls, row)


class DelegationNode(TokenUsageMixin):
    id: str
    parent_id: Optional[str] = None
    agent: str
    model: Optional[str] = None
    title: str
    time_created: int
    depth: int = 0
    children: list["DelegationNode"] = []

    @classmethod
    def from_row(cls, row: dict) -> "DelegationNode":
        return model_from_row(cls, row)


def build_tree(nodes: list[DelegationNode]) -> list[DelegationNode]:
    """Convert flat list of nodes into a hierarchy tree."""
    if not nodes:
        return []

    node_map = {n.id: n for n in nodes}
    roots = []

    for node in nodes:
        if node.parent_id and node.parent_id in node_map:
            node_map[node.parent_id].children.append(node)
        else:
            roots.append(node)

    for n in node_map.values():
        n.children.sort(key=lambda x: x.time_created)

    return roots
