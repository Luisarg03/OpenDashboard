import logging

from pydantic import BaseModel, computed_field
from typing import Optional

logger = logging.getLogger(__name__)


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
    dropped = set(row.keys()) - set(model_cls.model_fields.keys())
    if dropped:
        logger.warning(
            "model_from_row: dropped fields %s for %s", dropped, model_cls.__name__
        )
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
    # Root-only metadata (defaults to 0/None for non-root queries).
    child_count: int = 0
    chain_cost: float = 0
    chain_tokens: int = 0
    summary_additions: int = 0
    summary_deletions: int = 0
    summary_files: int = 0
    summary_diffs: Optional[str] = None
    time_archived: Optional[int] = None
    time_compacting: Optional[int] = None

    @computed_field
    @property
    def is_archived(self) -> bool:
        return bool(self.time_archived)

    @computed_field
    @property
    def is_compacting(self) -> bool:
        return bool(self.time_compacting)

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


def to_dict(obj: BaseModel) -> dict:
    """Serialize a Pydantic model to a plain JSON-serializable dict."""
    return obj.model_dump()


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
