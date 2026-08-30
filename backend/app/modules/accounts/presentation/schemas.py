from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from ..domain.models import SafeAccountContext


class RegisterRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "email": "owner@example.com",
                "password": "a-secure-password",
                "organization_name": "شرکت نمونه",
            }
        },
    )

    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    organization_name: str = Field(min_length=2, max_length=120)


class LoginRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "email": "owner@example.com",
                "password": "a-secure-password",
            }
        },
    )

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    email: str


class AuthOrganizationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str


class AuthMembershipResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["OWNER", "OPERATOR"]


class AuthContextResponse(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user": {
                    "id": "10d13828-338a-4fc9-8b21-7fe4724935df",
                    "email": "owner@example.com",
                },
                "organization": {
                    "id": "6c01201c-dbec-4b43-a2e8-f876923441fc",
                    "name": "شرکت نمونه",
                },
                "membership": {"role": "OWNER"},
            }
        },
    )

    user: AuthUserResponse
    organization: AuthOrganizationResponse
    membership: AuthMembershipResponse

    @classmethod
    def from_account(cls, account: SafeAccountContext) -> "AuthContextResponse":
        return cls(
            user=AuthUserResponse(id=account.user_id, email=account.email),
            organization=AuthOrganizationResponse(
                id=account.organization_id,
                name=account.organization_name,
            ),
            membership=AuthMembershipResponse(role=account.role.value),
        )
