from fastapi import Request

from ..application.services import SupplierServices


def get_supplier_services(request: Request) -> SupplierServices:
    services = request.app.state.supplier_services
    if not isinstance(services, SupplierServices):
        raise RuntimeError("Supplier services are not configured")
    return services
