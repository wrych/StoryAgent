from sqlmodel import SQLModel, create_engine
import os

DATABASE_URL = "sqlite:///./story_agent.db"

engine = create_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

def create_db_and_tables():
    from models import Story, BibleElement, Chapter, VersionHistory
    SQLModel.metadata.create_all(engine)
