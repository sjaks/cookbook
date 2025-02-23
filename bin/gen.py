from os import listdir
from os.path import isfile, join

HEADLINE = "Reseptejä, jotka ovat ihan ok 🥘 Iso osa vegaanisia, mutta kaikki ainakin lakto-ovo 🥦."
FOOTER = "[https://sjaks.iki.fi/](https://sjaks.iki.fi/)"

FILE_SOURCE = "src/"
FILE_TARGET = "recipe/"
INDEX = "README.md"

URL_PRE = "https://sjaks.iki.fi/cookbook/"
CONTR_TEXT = "[Haluatko parantaa reseptiä?](https://github.com/sjaks/cookbook/edit/master/"

recipes = [f for f in listdir(FILE_SOURCE) if isfile(join(FILE_SOURCE, f))]
print("Found", len(recipes), "recipes.")

index_contents = HEADLINE + "\n\n"
recipe_table = []

for recipe in recipes:
    source_path = join(FILE_SOURCE, recipe)
    target_path = join(FILE_TARGET, recipe)
    recipe_url = URL_PRE + target_path.replace(".md", "")

    with open(source_path) as f:
        body = f.read()
        content = body.splitlines()
        recipe_name = content[0].replace("#", "").strip()
        recipe_name_title = recipe_name

        md_link = "- [{}]({})".format(recipe_name_title, recipe_url)
        recipe_table.append(md_link)

        write_content = body + '\n' + CONTR_TEXT + source_path + ')  \n' + FOOTER
        with open(target_path, 'w') as fw:
            fw.write(write_content)

index_contents += "\n".join(sorted(recipe_table))
index_contents += "\n\n" + FOOTER

with open(INDEX, 'w') as f:
    f.write(index_contents)
