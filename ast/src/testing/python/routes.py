from fastapi import APIRouter, Depends, HTTPException, status 
from sqlalchemy.orm import Session 
from typing import List
from .model import UserCreate, UserResponse, User
from .db import get_db


router = APIRouter()

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    """
    Get user details by user id
    """
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "data" : user,
        "message" : "User details fetched successfully",
        "status" : status.HTTP_200_OK
    }

@router.post("/users/", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Create new user
    """
    new_user = User(name=user.name, email=user.email, is_active=user.is_active)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "data" : new_user,
        "message" : "User created successfully",
        "status" : status.HTTP_201_CREATED
    }
