import pytest

from app.modules.suppliers.application.dto import UpdateSupplierCommand
from app.modules.suppliers.domain.errors import SupplierError, SupplierErrorCode
from app.modules.suppliers.domain.normalization import normalize_supplier_name


def test_supplier_name_normalization_is_deterministic_for_persian_text() -> None:
    name = normalize_supplier_name("  تام\u064aن\u00a0\u0643نند\u0647  ACME  ")

    assert name.display_name == "تامین کننده ACME"
    assert name.normalized_name == "تامین کننده acme"


@pytest.mark.parametrize("value", ["", "   ", "\u0627", "x" * 121])
def test_supplier_name_rejects_invalid_lengths(value: str) -> None:
    with pytest.raises(SupplierError) as raised:
        normalize_supplier_name(value)

    assert raised.value.code is SupplierErrorCode.INVALID_SUPPLIER_NAME


def test_supplier_update_requires_at_least_one_field() -> None:
    with pytest.raises(SupplierError) as raised:
        UpdateSupplierCommand.create(name=None, is_active=None)

    assert raised.value.code is SupplierErrorCode.SUPPLIER_UPDATE_EMPTY


def test_supplier_update_normalizes_name_without_changing_status() -> None:
    command = UpdateSupplierCommand.create(name="  شركت نمونه  ", is_active=None)

    assert command.name == "شرکت نمونه"
    assert command.normalized_name == "شرکت نمونه"
    assert command.is_active is None
