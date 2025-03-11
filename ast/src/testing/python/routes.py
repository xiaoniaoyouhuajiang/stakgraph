from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .model import CreateOrEditPerson, PersonResponse
from .db import get_db, get_person_by_id, create_new_person


router = APIRouter()


@router.get("/person/{id}", response_model=PersonResponse)
async def get_person(id: int, db: Session = Depends(get_db)):
    """
    Get user details by user id
    """
    person = get_person_by_id(db, id)
    if person is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return {
        "data": person,
        "message": "Person details fetched successfully",
        "status": status.HTTP_200_OK
    }


@router.post("/person/", response_model=PersonResponse)
async def create_person(person: CreateOrEditPerson, db: Session = Depends(get_db)):
    """
    Create new user
    """
    new_person = create_new_person(db, person)
    return {
        "data": new_person,
        "message": "Person created successfully",
        "status": status.HTTP_201_CREATED
    }
