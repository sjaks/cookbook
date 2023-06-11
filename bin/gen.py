from os import listdir
from os.path import isfile, join

HEADLINE = "Reseptejä, jotka ovat ihan ok 🥘 Iso osa vegaanisia, mutta kaikki ainakin lakto-ovo 🥦."
ALLRGEN_INFO = "🥚 sisältää kananmunaa 🥛 sisältää maitoa 💲 halpa ⭐ suosikki"
FOOTER = "Kirjoittanut [https://sjaks.iki.fi/](https://sjaks.iki.fi/)."
FILE_SRC = "recipe/"
INDEX = "README_test.md"
URL_PRE = "https://sjaks.iki.fi/cookbook/"
CONTR_TEXT = "[Contribute to this recipe](https://github.com/sjaks/cookbook/edit/master/recipe/"

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
        contribute_line = content[-1]
        md_link = "- [{}]({})".format(recipe_name, full_url)

        if not contribute_line.startswith("[Contribute"):
            with open(full_path, 'a') as g:
                g.write("\n\n" + CONTR_TEXT + full_path + ")")

        recipe_allergens = content[-4].strip()
        if len(recipe_allergens) < 4:
            md_link += " (" + recipe_allergens + ")"

        recipe_table.append(md_link)

index_contents += "\n".join(sorted(recipe_table))
index_contents += "\n\n" + ALLRGEN_INFO
index_contents += "\n\n" + FOOTER

with open(INDEX, 'w') as f:
    f.write(index_contents)
