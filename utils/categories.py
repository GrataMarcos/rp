from typing import TypedDict


class CategoryInfo(TypedDict):
    emoji: str
    label: str


CATEGORIES: dict[str, CategoryInfo] = {
    "comida":          {"emoji": "🍔", "label": "Comida y Restaurantes"},
    "supermercado":    {"emoji": "🛒", "label": "Supermercado"},
    "transporte":      {"emoji": "🚗", "label": "Transporte"},
    "hogar":           {"emoji": "🏠", "label": "Hogar y Casa"},
    "salud":           {"emoji": "💊", "label": "Salud y Farmacia"},
    "entretenimiento": {"emoji": "🎮", "label": "Entretenimiento"},
    "ropa":            {"emoji": "👕", "label": "Ropa y Accesorios"},
    "educacion":       {"emoji": "📚", "label": "Educación"},
    "servicios":       {"emoji": "🔧", "label": "Servicios y Suscripciones"},
    "trabajo":         {"emoji": "💼", "label": "Trabajo y Negocios"},
    "viajes":          {"emoji": "✈️", "label": "Viajes y Turismo"},
    "otros":           {"emoji": "❓", "label": "Otros"},
}

_FALLBACK: CategoryInfo = {"emoji": "❓", "label": "Otros"}


def get_category(key: str) -> CategoryInfo:
    return CATEGORIES.get(key, _FALLBACK)
