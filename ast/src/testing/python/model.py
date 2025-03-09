from sqlalchemy import Column, Integer, String, Boolean 
from .db import Base 
from pydantic import BaseModel

class User(Base):
    """
    User model for storing user details
    """
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    is_active  = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<User {self.name}>"
    
    def __str__(self):
        return {
            "id" : self.id,
            "name" : self.name,
            "email" : self.email,
            "is_active" : self.is_active
        }
        
class UserCreate(BaseModel):
    """
    UserCreate model for creating new user
    """
    name: str
    email: str
    is_active: bool = True

class UserResponse(BaseModel):
    """
    UserResponse model for returning user details
    """
    id: int
    name: str
    email: str
    is_active: bool

