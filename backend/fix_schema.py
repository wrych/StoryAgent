import urllib.request
import json

default_schema = {
    "story_settings": {
        "name": "Story Settings",
        "fields": [
            {"key": "title_working", "label": "Working Title", "type": "string"},
            {"key": "logline", "label": "Logline", "type": "text"},
            {"key": "genre", "label": "Genre", "type": "array"},
            {"key": "setting_one_liner", "label": "Setting One-liner", "type": "text"},
            {"key": "tone", "label": "Tone", "type": "array"},
            {"key": "themes", "label": "Themes", "type": "array"},
            {"key": "narrative", "label": "Narrative Details", "type": "object", "fields": [
                {"key": "format", "label": "Format", "type": "string"},
                {"key": "target_length_words", "label": "Target Length (Words)", "type": "number"},
                {"key": "pov", "label": "POV", "type": "string"}
            ]}
        ]
    },
    "character": {
        "name": "Character",
        "fields": [
            {"key": "role", "label": "Role", "type": "string"},
            {"key": "goal", "label": "Primary Goal", "type": "text"},
            {"key": "flaws", "label": "Flaws", "type": "array"}
        ]
    },
    "location": {
        "name": "Location",
        "fields": [
            {"key": "description", "label": "Description", "type": "text"},
            {"key": "sights", "label": "Sights", "type": "array"},
            {"key": "smells", "label": "Smells", "type": "array"}
        ]
    }
}

try:
    req = urllib.request.Request(
        "http://localhost:8000/settings/bible_schema",
        data=json.dumps(default_schema).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as response:
        print("Schema updated successfully.")
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error updating schema: {e}")
