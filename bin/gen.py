#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
RECIPE_DIR = ROOT_DIR / "recipe"
README_PATH = ROOT_DIR / "README.md"
BASE_URL = "https://sjaks.iki.fi/cookbook"


def read_recipe(recipe_path: Path) -> tuple[str, str]:
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
	link = f"{BASE_URL}/recipe/{recipe_path.stem}"
	return title, link


def build_readme() -> str:
	recipes: list[tuple[str, str]] = []

	for recipe_path in sorted(RECIPE_DIR.glob("*.md")):
		recipes.append(read_recipe(recipe_path))

	recipes.sort(key=lambda item: item[0].casefold())

	return "\n".join(f"- [{title}]({link})" for title, link in recipes) + "\n"


def main() -> None:
	readme = build_readme()
	README_PATH.write_text(readme, encoding="utf-8")


if __name__ == "__main__":
	main()
