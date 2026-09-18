from fastapi import Request

from ..application.import_services import PriceListImportServices


def get_price_list_import_services(request: Request) -> PriceListImportServices:
    services = request.app.state.price_list_import_services
    if not isinstance(services, PriceListImportServices):
        raise RuntimeError("Price-list import services are not configured")
    return services
