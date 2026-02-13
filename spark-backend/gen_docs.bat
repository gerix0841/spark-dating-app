@echo off
set PYTHONPATH=.

echo Generating OpenAPI JSON...
python scripts/generate_docs.py

if not exist openapi.json (
    echo.
    echo ERROR: openapi.json was not generated. Check the Python error above.
    pause
    exit /b
)

echo Generating ReDoc HTML...
if not exist docs mkdir docs
npx @redocly/cli build-docs openapi.json -o docs/index.html

echo Generating Markdown documentation...
widdershins openapi.json -o API_DOCS.md

echo.
echo SUCCESS: Documentation updated!
pause