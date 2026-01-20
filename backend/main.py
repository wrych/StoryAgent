from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import crud, models, database

app = FastAPI(title="Story Writing Agent API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    database.create_db_and_tables()
    
    # Initialize default schemas
    import json
    from defaults import DEFAULT_LISTS
    
    # Seed default lists if not present
    for key, values in DEFAULT_LISTS.items():
        if not crud.get_global_setting(key):
            crud.set_global_setting(key, values)

    # Fetch current genres for schema
    current_genres = crud.get_global_setting("genres")
    genre_options = json.loads(current_genres.value) if current_genres else DEFAULT_LISTS["genres"]

    # Initialize default schemas - SIMPLIFIED as per user request
    default_schema = {
        "story_settings": {
            "name": "Story Settings",
            "fields": [
                {"key": "genre", "label": "Genre", "type": "select", "options": genre_options},
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "character": {
            "name": "Character",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "location": {
            "name": "Location",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "arc": {
            "name": "Story Arc",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        },
        "timeline": {
            "name": "Timeline",
            "fields": [
                {"key": "description", "label": "Description", "type": "text"}
            ]
        }
    }
    
    existing = crud.get_global_setting("bible_schema")
    if not existing:
        crud.set_global_setting("bible_schema", default_schema)

@app.get("/stories", response_model=List[models.Story])
def read_stories():
    return crud.get_stories()

@app.post("/stories", response_model=models.Story)
def create_story(story: models.Story):
    return crud.create_story(story)

@app.get("/stories/{story_id}/bible", response_model=List[models.BibleElement])
def read_bible_elements(story_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.BibleElement).where(models.BibleElement.story_id == story_id, models.BibleElement.is_deleted == False)).all()

@app.post("/bible", response_model=models.BibleElement)
def create_bible_element(element: models.BibleElement):
    return crud.create_bible_element(element)

@app.put("/bible/{element_id}", response_model=models.BibleElement)
def update_bible_element(element_id: int, element: models.BibleElement):
    updated = crud.update_bible_element(element_id, element.name, element.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Element not found")
    return updated

@app.get("/stories/{story_id}/chapters", response_model=List[models.Chapter])
def read_chapters(story_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.Chapter).where(models.Chapter.story_id == story_id, models.Chapter.is_deleted == False).order_by(models.Chapter.order)).all()

@app.post("/chapters", response_model=models.Chapter)
def create_chapter(chapter: models.Chapter):
    return crud.create_chapter(chapter)

@app.put("/chapters/{chapter_id}", response_model=models.Chapter)
def update_chapter(chapter_id: int, chapter: models.Chapter):
    updated = crud.update_chapter(chapter_id, chapter.title, chapter.content)
    if not updated:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return updated

@app.get("/chapters/{chapter_id}/history", response_model=List[models.VersionHistory])
def read_chapter_history(chapter_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.VersionHistory).where(models.VersionHistory.chapter_id == chapter_id).order_by(models.VersionHistory.version.desc())).all()

@app.get("/bible/{element_id}/history", response_model=List[models.VersionHistory])
def read_bible_history(element_id: int):
    from sqlmodel import Session, select
    with Session(database.engine) as session:
        return session.exec(select(models.VersionHistory).where(models.VersionHistory.bible_element_id == element_id).order_by(models.VersionHistory.version.desc())).all()

@app.delete("/stories/{story_id}")
def delete_story(story_id: int):
    if not crud.delete_story(story_id):
        raise HTTPException(status_code=404, detail="Story not found")
    return {"message": "Story deleted"}

@app.delete("/bible/{element_id}")
def delete_bible_element(element_id: int):
    if not crud.delete_bible_element(element_id):
        raise HTTPException(status_code=404, detail="Element not found")
    return {"message": "Element deleted"}

@app.delete("/chapters/{chapter_id}")
def delete_chapter(chapter_id: int):
    if not crud.delete_chapter(chapter_id):
        raise HTTPException(status_code=404, detail="Chapter not found")
    return {"message": "Chapter deleted"}

@app.get("/settings")
def read_all_settings():
    import json
    settings = crud.get_all_global_settings()
    result = {}
    for s in settings:
        try:
            result[s.key] = json.loads(s.value)
        except:
            result[s.key] = s.value
    return result

@app.get("/settings/{key}")
def read_setting(key: str):
    setting = crud.get_global_setting(key)
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    import json
    return json.loads(setting.value)

@app.post("/settings/{key}")
def update_setting(key: str, value: dict):
    crud.set_global_setting(key, value)
    return {"message": "Setting updated"}
