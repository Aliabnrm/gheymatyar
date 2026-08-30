import argparse
import asyncio
import getpass
import sys

from app.core.config import Settings
from app.infrastructure.database import create_database_runtime
from app.modules.accounts.application.logout import LogoutAccount
from app.modules.accounts.application.register import RegisterAccount
from app.modules.accounts.domain.errors import AccountError
from app.modules.accounts.infrastructure.passwords import Argon2PasswordHasher
from app.modules.accounts.infrastructure.repositories import SqlAlchemyAccountStore
from app.modules.accounts.infrastructure.tokens import SecureTokenService


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ایجاد امن مالک و سازمان اولیه قیمت‌یار",
    )
    parser.add_argument("--email", required=True, help="ایمیل مالک اولیه")
    parser.add_argument("--organization-name", required=True, help="نام سازمان اولیه")
    arguments = parser.parse_args()
    password = getpass.getpass("رمز عبور (۱۲ تا ۱۲۸ نویسه): ")
    confirmation = getpass.getpass("تکرار رمز عبور: ")
    if password != confirmation:
        parser.error("رمز عبور و تکرار آن یکسان نیستند.")

    try:
        asyncio.run(
            _create_owner(
                settings=Settings(),
                email=arguments.email,
                password=password,
                organization_name=arguments.organization_name,
            )
        )
    except AccountError as exc:
        print(f"ایجاد حساب انجام نشد: {exc.message}", file=sys.stderr)
        raise SystemExit(1) from exc
    except Exception:
        print(
            "ایجاد حساب به‌دلیل خطای داخلی انجام نشد؛ اتصال و migration را بررسی کنید.",
            file=sys.stderr,
        )
        raise SystemExit(1) from None


async def _create_owner(
    *,
    settings: Settings,
    email: str,
    password: str,
    organization_name: str,
) -> None:
    database = create_database_runtime(settings)
    store = SqlAlchemyAccountStore(database.session_factory)
    try:
        registered = await RegisterAccount(
            store=store,
            password_hasher=Argon2PasswordHasher(),
            token_service=SecureTokenService(),
            session_ttl_seconds=settings.auth_session_ttl_seconds,
            registration_enabled=True,
        ).execute(
            email=email,
            password=password,
            organization_name=organization_name,
        )
        # CLI توکن خام را تحویل مرورگر نمی‌دهد؛ نشست یک‌بارمصرف همان use case را فوراً می‌بندیم.
        await LogoutAccount(store=store).execute(registered.session_id)
    finally:
        await database.dispose()

    print("حساب مالک و سازمان با موفقیت ساخته شد. اکنون می‌توانید از صفحه ورود استفاده کنید.")
