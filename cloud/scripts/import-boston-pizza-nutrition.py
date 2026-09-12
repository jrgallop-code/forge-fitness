#!/usr/bin/env python3
"""Build Level Up's Boston Pizza catalogue from the official nutrition page.

Usage:
  curl -fsSL https://bostonpizza.com/en/nutritional-information.html \
    | python cloud/scripts/import-boston-pizza-nutrition.py
"""

from __future__ import annotations

import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


SOURCE_URL = "https://bostonpizza.com/en/nutritional-information.html"
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "boston-pizza-foods.js"
SECTION_NAMES = {
    "apps-sharables": "Apps and Shareables",
    "mains": "Mains",
    "bowls-salads": "Bowls and Salads",
    "sandwiches": "Sandwiches & Burgers",
    "desserts": "Desserts",
    "copy-parent-experience-fragment2": "Sides",
    "copy-parent-experience-fragment1": "GlutenWise®",
    "kids": "Kids",
    "pasta": "Pasta",
    "pizza": "Pizza",
}
NUTRIENT_KEYS = {
    "calories": "calories",
    "protein": "protein",
    "carbohydrates": "carbs",
    "fat": "fat",
    "dietary fiber": "fiber",
}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def number(value: str) -> float:
    match = re.search(r"-?[\d.]+", value.replace(",", ""))
    return float(match.group(0)) if match else 0.0


def slug(value: str) -> str:
    normalized = html.unescape(value).lower().replace("®", "")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "item"


class NutritionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[dict] = []
        self.section = ""
        self.card: dict | None = None
        self.variant: dict | None = None
        self.li_values: list[str] | None = None
        self.text_target: list[str] | None = None
        self.rows: list[dict] = []

    def handle_starttag(self, tag: str, attrs_list: list[tuple[str, str | None]]) -> None:
        attrs = {key: value or "" for key, value in attrs_list}
        classes = set(attrs.get("class", "").split())
        node = {"tag": tag, "kind": ""}

        if tag == "div" and "individual-accordion" in classes:
            key = attrs.get("data-id", "").rstrip("/").split("/")[-1].lower()
            self.section = SECTION_NAMES.get(key, clean_text(key.replace("-", " ")).title())
            node["kind"] = "section"
        elif tag == "div" and "nutrition-recipe-accordian--card" in classes:
            self.card = {"name": "", "section": self.section, "variants": []}
            node["kind"] = "card"
        elif tag == "div" and self.card is not None and "recipe-description--title" in classes:
            self.variant = {"label": "", "nutrition": {}}
            node["kind"] = "variant"
        elif tag == "h3" and self.card is not None and "nutrition-recipe-accordian--card-header" in classes:
            self.text_target = []
            node["kind"] = "card_name"
        elif tag == "h4" and self.variant is not None:
            self.text_target = []
            node["kind"] = "variant_name"
        elif tag == "li" and self.variant is not None and "recipe-description--lists-item" in classes:
            self.li_values = []
            node["kind"] = "nutrient"
        elif tag == "p" and self.li_values is not None:
            self.text_target = []
            node["kind"] = "nutrient_value"

        self.stack.append(node)

    def handle_data(self, data: str) -> None:
        if self.text_target is not None:
            self.text_target.append(data)

    def handle_endtag(self, tag: str) -> None:
        index = next((i for i in range(len(self.stack) - 1, -1, -1) if self.stack[i]["tag"] == tag), None)
        if index is None:
            return
        nodes = self.stack[index:]
        del self.stack[index:]
        for node in reversed(nodes):
            self._finish(node.get("kind", ""))

    def _finish(self, kind: str) -> None:
        if kind == "card_name" and self.card is not None:
            self.card["name"] = clean_text("".join(self.text_target or []))
            self.text_target = None
        elif kind == "variant_name" and self.variant is not None:
            self.variant["label"] = clean_text("".join(self.text_target or []))
            self.text_target = None
        elif kind == "nutrient_value":
            if self.li_values is not None:
                self.li_values.append(clean_text("".join(self.text_target or [])))
            self.text_target = None
        elif kind == "nutrient":
            if self.variant is not None and self.li_values and len(self.li_values) >= 2:
                key = NUTRIENT_KEYS.get(self.li_values[0].lower())
                if key:
                    self.variant["nutrition"][key] = number(self.li_values[1])
            self.li_values = None
        elif kind == "variant":
            if self.card is not None and self.variant is not None and self.variant["nutrition"].get("calories", 0) > 0:
                self.card["variants"].append(self.variant)
            self.variant = None
        elif kind == "card":
            if self.card is not None:
                self._append_card(self.card)
            self.card = None
        elif kind == "section":
            self.section = ""

    def _append_card(self, card: dict) -> None:
        base_name = clean_text(card.get("name", ""))
        section = clean_text(card.get("section", ""))
        if not base_name or not section:
            return
        variants = card.get("variants") or []
        for variant in variants:
            label = clean_text(variant.get("label", ""))
            name = base_name if not label or label.lower() in base_name.lower() else f"{base_name} - {label}"
            nutrition = variant.get("nutrition", {})
            self.rows.append({
                "name": name,
                "baseName": base_name,
                "variant": label,
                "menuSection": section,
                "calories": nutrition.get("calories", 0),
                "protein": nutrition.get("protein", 0),
                "carbs": nutrition.get("carbs", 0),
                "fat": nutrition.get("fat", 0),
                "fiber": nutrition.get("fiber", 0),
            })


def serving_label(row: dict) -> str:
    variant = row["variant"]
    if row["menuSection"] == "Pizza":
        match = re.match(r"^(Small|Medium|Large)\s*\(per slice\)$", variant, re.I)
        if match:
            return f"1 slice ({match.group(1).lower()} pizza)"
        if variant.lower() in {"indy", "individual"}:
            return "1 individual pizza"
    return f"1 serving ({variant})" if variant else "1 serving"


def js_number(value: float) -> str:
    return str(int(value)) if value.is_integer() else str(value)


def build_module(rows: list[dict]) -> str:
    seen: dict[str, int] = {}
    calls = []
    for row in rows:
        base_id = slug(f"{row['menuSection']} {row['name']}")
        seen[base_id] = seen.get(base_id, 0) + 1
        row_id = base_id if seen[base_id] == 1 else f"{base_id}-{seen[base_id]}"
        values = [
            json.dumps(row_id, ensure_ascii=False),
            json.dumps(row["name"], ensure_ascii=False),
            json.dumps(row["menuSection"], ensure_ascii=False),
            json.dumps(serving_label(row), ensure_ascii=False),
            js_number(float(row["calories"])),
            js_number(float(row["protein"])),
            js_number(float(row["carbs"])),
            js_number(float(row["fat"])),
            js_number(float(row["fiber"])),
        ]
        calls.append(f"    row({', '.join(values)})")
    body = ",\n".join(calls)
    return f'''// Generated from Boston Pizza Canada's official nutrition page on 2026-09-12.
// Published values are preserved exactly. Pizza rows use the published per-slice
// nutrition; Level Up adds whole-pizza portions from the official menu slice counts.
const SOURCE_URL = {json.dumps(SOURCE_URL)};

export const BOSTON_PIZZA_FOODS = [
{body}
];

function row(id, name, menuSection, label, calories, protein, carbs, fat, fiber) {{
    return {{
        id: `boston-pizza-ca-${{id}}`,
        name,
        brand: "Boston Pizza",
        aliases: `boston pizza bp restaurant canada ${{menuSection}}`,
        menuSection,
        label,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        nutritionScope: "full",
        countryCode: "CA",
        sourceName: "Boston Pizza Canada official nutrition page",
        sourceUrl: SOURCE_URL
    }};
}}
'''


def main() -> None:
    source = sys.stdin.read()
    if "nutrition-recipe-accordian--card" not in source:
        raise SystemExit("Boston Pizza nutrition HTML was not provided on stdin")
    parser = NutritionParser()
    parser.feed(source)
    rows = []
    seen = set()
    for row in parser.rows:
        key = (row["menuSection"].casefold(), row["name"].casefold())
        if key in seen:
            continue
        seen.add(key)
        rows.append(row)
    sections = sorted({row["menuSection"] for row in rows})
    if len(rows) < 100 or "Pizza" not in sections:
        raise SystemExit(f"Refusing incomplete import: {len(rows)} rows across {len(sections)} sections")
    if not any(row["name"] == "Thai Chicken Wrap - Grilled chicken" for row in rows):
        raise SystemExit("Refusing import without Thai Chicken Wrap - Grilled chicken")
    OUTPUT.write_text(build_module(rows), encoding="utf-8")
    print(f"Wrote {len(rows)} Boston Pizza foods across {len(sections)} sections to {OUTPUT}")


if __name__ == "__main__":
    main()
