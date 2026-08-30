from dataclasses import dataclass

from .get_current_account import GetCurrentAccount
from .login import LoginAccount
from .logout import LogoutAccount
from .register import RegisterAccount
from .validate_csrf import ValidateCsrf


@dataclass(frozen=True, slots=True)
class AccountServices:
    register: RegisterAccount
    login: LoginAccount
    current: GetCurrentAccount
    logout: LogoutAccount
    csrf: ValidateCsrf
