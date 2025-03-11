from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .model import Person, CreateOrEditPerson
from contextlib import contextmanager

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={
                       "check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    except:
        print("Error accessing database")
    finally:
        db.close()


@contextmanager
def db_session():
    db = SessionLocal()
    try:
        yield db
    except:
        print("Error accessing database")
    finally:
        db.close()


def get_person_by_id(db, person_id: int):
    """Get a person by their ID"""
    return db.query(Person).filter(Person.id == person_id).first()


def create_new_person(db, person_data: CreateOrEditPerson):
    """Create a new person in the database"""
    new_person = Person(name=person_data.name, email=person_data.email)
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    return new_person
