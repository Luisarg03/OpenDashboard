"""Tests for models module."""
from opendashboard.models import (
    SessionSummary,
    DelegationNode,
    model_from_row,
    build_tree,
    TokenUsageMixin,
)


class TestTokenUsageMixin:
    def test_defaults(self):
        obj = TokenUsageMixin()
        assert obj.cost == 0
        assert obj.tokens_input == 0
        assert obj.tokens_output == 0
        assert obj.tokens_reasoning == 0
        assert obj.tokens_cache_read == 0
        assert obj.tokens_cache_write == 0

    def test_custom_values(self):
        obj = TokenUsageMixin(cost=1.5, tokens_input=100, tokens_output=50)
        assert obj.cost == 1.5
        assert obj.tokens_input == 100
        assert obj.tokens_output == 50


class TestModelFromRow:
    def test_ignores_extra_fields(self):
        row = {
            "id": "ses_001", "parent_id": None, "project_id": "proj_001",
            "agent": "test", "model": "gpt-4", "title": "Test",
            "time_created": 1000, "time_updated": 2000,
            "cost": 0.5, "tokens_input": 100, "tokens_output": 50,
            "tokens_reasoning": 10, "tokens_cache_read": 5, "tokens_cache_write": 2,
            "extra_field": "ignored",
        }
        result = model_from_row(SessionSummary, row)
        assert result.id == "ses_001"
        assert result.cost == 0.5
        assert not hasattr(result, "extra_field")

    def test_with_delegation_node(self):
        row = {
            "id": "ses_001", "parent_id": None,
            "agent": "test", "model": "gpt-4", "title": "Test",
            "time_created": 1000, "depth": 0,
            "cost": 0.5, "tokens_input": 100, "tokens_output": 50,
            "tokens_reasoning": 10, "tokens_cache_read": 5, "tokens_cache_write": 2,
        }
        result = model_from_row(DelegationNode, row)
        assert result.id == "ses_001"
        assert result.depth == 0


class TestSessionSummary:
    def test_from_row(self):
        row = {
            "id": "ses_001", "parent_id": None, "project_id": "proj_001",
            "agent": "test", "model": "gpt-4", "title": "Test",
            "time_created": 1000, "time_updated": 2000,
            "cost": 0.5, "tokens_input": 100, "tokens_output": 50,
            "tokens_reasoning": 10, "tokens_cache_read": 5, "tokens_cache_write": 2,
        }
        result = SessionSummary.from_row(row)
        assert isinstance(result, SessionSummary)
        assert result.id == "ses_001"

    def test_missing_optional_fields(self):
        row = {
            "id": "ses_001", "parent_id": None, "project_id": "proj_001",
            "agent": "test", "title": "Test",
            "time_created": 1000, "time_updated": 2000,
        }
        result = SessionSummary.from_row(row)
        assert result.model is None
        assert result.cost == 0


class TestDelegationNode:
    def test_from_row(self):
        row = {
            "id": "ses_001", "parent_id": None,
            "agent": "test", "model": "gpt-4", "title": "Test",
            "time_created": 1000, "depth": 0,
            "cost": 0.5, "tokens_input": 100, "tokens_output": 50,
            "tokens_reasoning": 10, "tokens_cache_read": 5, "tokens_cache_write": 2,
        }
        result = DelegationNode.from_row(row)
        assert isinstance(result, DelegationNode)
        assert result.depth == 0


class TestBuildTree:
    def test_empty_list(self):
        assert build_tree([]) == []

    def test_single_root(self):
        nodes = [DelegationNode(
            id="a", agent="test", title="root", time_created=1000, depth=0,
        )]
        tree = build_tree(nodes)
        assert len(tree) == 1
        assert tree[0].id == "a"
        assert tree[0].children == []

    def test_parent_child_chain(self):
        nodes = [
            DelegationNode(id="a", agent="test", title="root",
                           time_created=1000, depth=0),
            DelegationNode(id="b", parent_id="a", agent="test", title="child",
                           time_created=2000, depth=1),
            DelegationNode(id="c", parent_id="b", agent="test", title="grandchild",
                           time_created=3000, depth=2),
        ]
        tree = build_tree(nodes)
        assert len(tree) == 1
        assert tree[0].id == "a"
        assert len(tree[0].children) == 1
        assert tree[0].children[0].id == "b"
        assert len(tree[0].children[0].children) == 1
        assert tree[0].children[0].children[0].id == "c"

    def test_multiple_roots(self):
        nodes = [
            DelegationNode(id="a", agent="test", title="root1",
                           time_created=1000, depth=0),
            DelegationNode(id="b", agent="test", title="root2",
                           time_created=2000, depth=0),
        ]
        tree = build_tree(nodes)
        assert len(tree) == 2

    def test_children_sorted_by_time(self):
        nodes = [
            DelegationNode(id="a", agent="test", title="root",
                           time_created=1000, depth=0),
            DelegationNode(id="c", parent_id="a", agent="test", title="child2",
                           time_created=3000, depth=1),
            DelegationNode(id="b", parent_id="a", agent="test", title="child1",
                           time_created=2000, depth=1),
        ]
        tree = build_tree(nodes)
        assert [c.id for c in tree[0].children] == ["b", "c"]

    def test_orphan_becomes_root(self):
        nodes = [DelegationNode(
            id="a", parent_id="nonexistent", agent="test", title="orphan",
            time_created=1000, depth=1,
        )]
        tree = build_tree(nodes)
        assert len(tree) == 1
        assert tree[0].id == "a"

    def test_excludes_non_tree_fields(self):
        node = DelegationNode(
            id="a", agent="test", title="root",
            time_created=1000, depth=0,
        )
        assert not hasattr(node, "project_id")
        assert not hasattr(node, "time_updated")
