from dataclasses import dataclass

from .create_supplier import CreateSupplier
from .get_supplier import GetSupplier
from .list_suppliers import ListSuppliers
from .update_supplier import UpdateSupplier


@dataclass(frozen=True, slots=True)
class SupplierServices:
    create: CreateSupplier
    list: ListSuppliers
    get: GetSupplier
    update: UpdateSupplier
