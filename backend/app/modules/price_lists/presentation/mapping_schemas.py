from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from ..application.mapping_dto import MappingTemplate
from ..application.mapping_services import MappingReview
from ..domain.mapping import CanonicalField, ColumnMapping


class ColumnMappingSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "sheet_name": "لیست قیمت",
                    "header_row": 5,
                    "columns": {"product_code": 2, "product_name": 3, "price_irr": 7},
                }
            ]
        },
    )
    sheet_name: str = Field(min_length=1, max_length=31)
    header_row: int = Field(ge=1, le=50020, strict=True)
    columns: dict[CanonicalField, Annotated[int, Field(ge=1, le=200, strict=True)]]

    def to_domain(self) -> ColumnMapping:
        return ColumnMapping(self.sheet_name, self.header_row, dict(self.columns))


class MappingColumnResponse(BaseModel):
    index: int
    label: str


class MappingPreviewResponse(BaseModel):
    source_row_number: int
    values: list[str]


class MappingIssueResponse(BaseModel):
    row: int | None
    field: CanonicalField | None
    code: str
    message: str


class MappingSnapshotResponse(BaseModel):
    sheets: list[str]
    detected_mapping: ColumnMappingSchema
    used_mapping: ColumnMappingSchema | None
    origin: Literal["detected", "manual", "template", "proposal"]
    template_id: UUID | None
    columns: list[MappingColumnResponse]
    ambiguous_fields: dict[CanonicalField, list[int]]
    preview: list[MappingPreviewResponse]
    issues: list[MappingIssueResponse]
    total_errors: int
    errors_truncated: bool


class MappingTemplateResponse(BaseModel):
    id: UUID
    source_import_id: UUID
    created_at: datetime
    mapping: ColumnMappingSchema

    @classmethod
    def from_domain(cls, template: MappingTemplate) -> "MappingTemplateResponse":
        return cls(
            id=template.id,
            source_import_id=template.source_import_id,
            created_at=template.created_at,
            mapping=ColumnMappingSchema.model_validate(template.mapping.as_dict()),
        )


class MappingReviewResponse(BaseModel):
    inspection: MappingSnapshotResponse
    saved_template: MappingTemplateResponse | None
    can_edit: bool
    historical_snapshot: bool

    @classmethod
    def from_domain(cls, review: MappingReview) -> "MappingReviewResponse":
        return cls(
            inspection=MappingSnapshotResponse.model_validate(review.inspection),
            saved_template=MappingTemplateResponse.from_domain(review.saved_template)
            if review.saved_template
            else None,
            can_edit=review.can_edit,
            historical_snapshot=review.historical_snapshot,
        )


class SaveMappingTemplateRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "source_import_id": "10d13828-338a-4fc9-8b21-7fe4724935df",
                    "expected_template_id": None,
                    "confirm_replace": False,
                }
            ]
        },
    )
    source_import_id: UUID
    expected_template_id: UUID | None = None
    confirm_replace: bool = Field(default=False, strict=True)
