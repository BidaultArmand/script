from fastapi import Header, HTTPException
from jose import jwt
from dotenv import load_dotenv
import os

load_dotenv() 
JWT_SECRET = os.getenv("JWT_SECRET") # ou vérifier via signing keys selon ta config
JWT_ALG = "HS256"

def get_current_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
