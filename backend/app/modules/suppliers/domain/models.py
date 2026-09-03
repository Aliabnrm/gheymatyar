from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Supplier:
    id: UUID
    organization_id: UUID
    name: str
    normalized_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
