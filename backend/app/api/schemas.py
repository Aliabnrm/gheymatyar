from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"] = "ok"


class ApiErrorBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, object] = Field(default_factory=dict)


class ApiErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ApiErrorBody
    request_id: str
