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
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "error": {
                    "code": "AUTH_REQUIRED",
                    "message": "برای ادامه ابتدا وارد حساب خود شوید.",
                    "details": {},
                },
                "request_id": "b7f4c2d88ee54f969f647a192f398ddd",
            }
        },
    )

    error: ApiErrorBody
    request_id: str
