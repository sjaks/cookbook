from os import listdir
from os.path import isfile, join

HEADLINE = "A collection of decent recipes 🥘 (in Finnish). Most recipes are vegan - but all are at least vegetarian 🥦."
FOOTER = "Written by [https://sjaks.iki.fi/](https://sjaks.iki.fi/)."
FILE_SRC = "recipe/"
INDEX = "README.md"
URL_PRE = "https://sjaks.fi/cookbook/"

recipes = [f for f in listdir(FILE_SRC) if isfile(join(FILE_SRC, f))]
print("Found", len(recipes), "recipes.")

index_contents = HEADLINE + "\n\n"
recipe_table = []

for recipe in recipes:
    full_path = join(FILE_SRC, recipe)
    full_url = URL_PRE + full_path.replace(".md", "")

    with open(full_path) as f:
        content = f.readlines()
        recipe_name = content[0].replace("#", "").strip()
        recipe_allergens = content[-1].strip()
        md_link = "- [{}]({})".format(recipe_name, full_url)

        if len(recipe_allergens) < 4:
            md_link += " (" + recipe_allergens + ")"

        recipe_table.append(md_link)

index_contents += "\n".join(sorted(recipe_table))
index_contents += "\n\n" + FOOTER

with open(INDEX, 'w') as f:
    f.write(index_contents)
