#!/usr/bin/env python3

from __future__ import annotations

import re
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
RECIPE_DIR = ROOT_DIR / "recipe"
README_PATH = ROOT_DIR / "README.md"
BASE_URL = "https://sjaks.iki.fi/cookbook"

KCAL_PATTERN = re.compile(r"(\d+)\s*kcal per annos", re.IGNORECASE)


def read_recipe(recipe_path: Path) -> tuple[int, str, str]:
	content = recipe_path.read_text(encoding="utf-8")
	lines = content.splitlines()

	if not lines:
		raise ValueError(f"Recipe file is empty: {recipe_path}")

	first_line = lines[0].strip()
	if not first_line.startswith("#"):
		raise ValueError(
			f"First line must be a markdown heading in file: {recipe_path}"
		)

	title = first_line.lstrip("#").strip()
	kcal_match = KCAL_PATTERN.search(content)
	if kcal_match is None:
		raise ValueError(f"Could not find kcal per annos in file: {recipe_path}")

	kcal = int(kcal_match.group(1))
	link = f"{BASE_URL}/recipe/{recipe_path.stem}"
	return kcal, title, link


def build_readme() -> str:
	recipes: list[tuple[int, str, str]] = []

	for recipe_path in sorted(RECIPE_DIR.glob("*.md")):
		recipes.append(read_recipe(recipe_path))

	recipes.sort(key=lambda item: (item[0], item[1].casefold()))

	return "\n".join(f"- [{title}]({link})" for _, title, link in recipes) + "\n"


def main() -> None:
	readme = build_readme()
	README_PATH.write_text(readme, encoding="utf-8")


if __name__ == "__main__":
	main()
