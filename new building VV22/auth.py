from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from database import database
from models import UserInDB, TokenData
import os

            # jwt setup
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")  # env secret
ALGORITHM = "HS256"                                           # hash type
ACCESS_TOKEN_EXPIRE_MINUTES = 30                              # token time

           
            # auth setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # bcrypt config
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")             # token path

           
           
            # check password
async def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)  # compare hashes

            
            
            
            
            # hash password
async def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)  # hash input





    # get user
async def get_user_by_username(username: str) -> Optional[UserInDB]:
    doc = await database.get_users_collection().find_one({"username": username})  # find user
    if not doc:
        return None
    return UserInDB(**doc)  # build model

                    # check credentials

async def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_username(username)           # fetch user
    if not user or not await verify_password(password, user.hashed_password):
        return None
    return user




                        # make token

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()                              # base payload
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))  # expiry time
    to_encode.update({"exp": expire})                    # add expiry
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # encode token

                        
                        
                        # decode token
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    credentials_exception = HTTPException(               # auth error
        status_code=401,
        detail="could not validate credentials",
        headers={"www-authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # decode jwt
        username: str = payload.get("sub")                               # get subject
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)        # build token model
    except JWTError:
        raise credentials_exception

    user_doc = await database.get_users_collection().find_one({"username": token_data.username})  # user fetch
    if not user_doc:
        raise credentials_exception
    return UserInDB(**user_doc)





# check enabled
async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    if current_user.disabled:                            # user inactive
        raise HTTPException(status_code=400, detail="inactive user")
    return current_user
