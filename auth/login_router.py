from auth.jwt.api_security import jwt_token,jwt_decode
from modules.students.repo import verify_credentials

from fastapi import APIRouter,HTTPException
from pydantic import BaseModel

router=APIRouter(prefix='/auth',tags=['auth'])

class LoginRequest(BaseModel):
    regno: str
    password:str

@router.post('/login')
def login(payload:LoginRequest):    
    result=verify_credentials(payload.regno,payload.password)
    if result == None:
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token=jwt_token({'student_id': result['id'],
                     'regno':result['regno']}
                     )

    return {'access_token':token,'token_type':'bearer'}

