from models import Story, BibleElement, Chapter, VersionHistory, GlobalSetting
from database import engine
from sqlmodel import Session, select
import json

def get_global_setting(key: str):
    with Session(engine) as session:
        return session.get(GlobalSetting, key)

def set_global_setting(key: str, value: dict):
    with Session(engine) as session:
        setting = session.get(GlobalSetting, key)
        if setting:
            setting.value = json.dumps(value)
        else:
            setting = GlobalSetting(key=key, value=json.dumps(value))
        session.add(setting)
        session.commit()
        session.commit()
        return setting

def get_all_global_settings():
    with Session(engine) as session:
        return session.exec(select(GlobalSetting)).all()

def get_stories():
    with Session(engine) as session:
        return session.exec(select(Story).where(Story.is_deleted == False)).all()

def create_story(story: Story):
    with Session(engine) as session:
        session.add(story)
        session.commit()
        session.refresh(story)
        
        # Create default Story Settings
        settings_schema = get_global_setting("bible_schema")
        default_content = ""
        if settings_schema:
            schema_data = json.loads(settings_schema.value)
            if "story_settings" in schema_data:
                # Initialize with empty values for each field in the schema
                content_obj = {}
                for field in schema_data["story_settings"].get("fields", []):
                    key = field.get("key")
                    if key:
                        if field.get("type") == "array":
                            content_obj[key] = []
                        elif field.get("type") == "object":
                            content_obj[key] = {}
                        else:
                            content_obj[key] = ""
                default_content = json.dumps(content_obj)

        settings_element = BibleElement(
            story_id=story.id,
            type="story_settings",
            name="Story Settings",
            content=default_content
        )
        session.add(settings_element)
        session.commit()
        
        # Initial version history for settings
        history = VersionHistory(
            bible_element_id=settings_element.id,
            version=1,
            content=settings_element.content
        )
        session.add(history)
        session.commit()
        
        return story

def create_bible_element(element: BibleElement):
    with Session(engine) as session:
        session.add(element)
        session.commit()
        session.refresh(element)
        
        # Initial version history
        history = VersionHistory(
            bible_element_id=element.id,
            version=element.version,
            content=element.content
        )
        session.add(history)
        session.commit()
        return element

def update_bible_element(element_id: int, name: str, content: str):
    with Session(engine) as session:
        element = session.get(BibleElement, element_id)
        if not element:
            return None
        
        element.name = name
        element.content = content
        element.version += 1
        
        history = VersionHistory(
            bible_element_id=element.id,
            version=element.version,
            content=element.content
        )
        session.add(element)
        session.add(history)
        session.commit()
        session.refresh(element)
        return element

def create_chapter(chapter: Chapter):
    with Session(engine) as session:
        session.add(chapter)
        session.commit()
        session.refresh(chapter)
        
        history = VersionHistory(
            chapter_id=chapter.id,
            version=chapter.version,
            content=chapter.content
        )
        session.add(history)
        session.commit()
        return chapter

def update_chapter(chapter_id: int, title: str, content: str):
    with Session(engine) as session:
        chapter = session.get(Chapter, chapter_id)
        if not chapter:
            return None
        
        chapter.title = title
        chapter.content = content
        chapter.version += 1
        
        history = VersionHistory(
            chapter_id=chapter.id,
            version=chapter.version,
            content=chapter.content
        )
        session.add(chapter)
        session.add(history)
        session.commit()
        session.refresh(chapter)
        return chapter

def delete_story(story_id: int):
    with Session(engine) as session:
        story = session.get(Story, story_id)
        if story:
            story.is_deleted = True
            session.add(story)
            session.commit()
            return True
        return False

def delete_bible_element(element_id: int):
    with Session(engine) as session:
        element = session.get(BibleElement, element_id)
        if element:
            if element.type == "story_settings":
                return False  # Protect from deletion
            element.is_deleted = True
            session.add(element)
            session.commit()
            return True
        return False

def delete_chapter(chapter_id: int):
    with Session(engine) as session:
        chapter = session.get(Chapter, chapter_id)
        if chapter:
            chapter.is_deleted = True
            session.add(chapter)
            session.commit()
            return True
        return False
