from fastapi import Request

from ..application.version_services import PriceListVersionServices


def get_price_list_version_services(request: Request) -> PriceListVersionServices:
    services = request.app.state.price_list_version_services
    if not isinstance(services, PriceListVersionServices):
        raise RuntimeError("Price-list version services are not configured")
    return services
