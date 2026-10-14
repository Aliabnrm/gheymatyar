from uuid import UUID

from ..domain.version_errors import PriceListVersionError, PriceListVersionErrorCode
from ..domain.version_models import PriceListVersion
from .version_ports import PriceListVersionStore


class CreatePriceListVersion:
    def __init__(self, store: PriceListVersionStore) -> None:
        self._store = store

    async def execute(
        self,
        *,
        organization_id: UUID,
        supplier_id: UUID,
        import_id: UUID,
        actor_user_id: UUID,
        expected_previous_version_id: UUID | None,
        confirm_create: bool,
    ) -> PriceListVersion:
        if not confirm_create:
            raise PriceListVersionError(
                PriceListVersionErrorCode.VERSION_CREATION_NOT_CONFIRMED,
                "برای ساخت نسخه تغییرناپذیر، تأیید صریح لازم است.",
            )
        return await self._store.create_from_import(
            organization_id=organization_id,
            supplier_id=supplier_id,
            import_id=import_id,
            actor_user_id=actor_user_id,
            expected_previous_version_id=expected_previous_version_id,
        )
