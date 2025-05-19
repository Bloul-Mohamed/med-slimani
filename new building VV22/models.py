from pydantic import BaseModel
from enum import Enum
from datetime import datetime

# user roles
class Role(str, Enum):
    PATIENT = "patient"          
    RESEARCHER = "researcher"    
    ADMIN = "admin"              

# base fields
class UserBase(BaseModel):
    username: str                # login name
    email: str                   # user email
    role: Role                   # user role

# signup input
class UserCreate(UserBase):
    password: str                # plain password

# user output
class User(UserBase):
    disabled: bool = False       # status flag

    class Config:
        from_attributes = True   # orm mode

# db record
class UserInDB(User):
    hashed_password: str         # hashed pass

# token schema
class Token(BaseModel):
    access_token: str            # jwt string
    token_type: str              # usually "bearer"

# token payload
class TokenData(BaseModel):
    username: str | None = None  # subject field

# audit log
class AuditLog(BaseModel):
    timestamp: datetime          # log time
    user_id: str                 # actor id
    action: str                  # what happened
    endpoint: str                # api route
    params: dict                 # input data
