import json
import os
from app.main import app

def save_openapi_json():
    openapi_data = app.openapi()
    file_path = "openapi.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, indent=2)
    print(f"Successfully saved OpenAPI spec to {file_path}")

if __name__ == "__main__":
    save_openapi_json()