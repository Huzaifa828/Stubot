import os
from dotenv import load_dotenv
import jwt
from datetime import datetime,timezone,timedelta
load_dotenv()

Jwt_Secret_Key=os.getenv('JWT_SECRET_KEY')
Algorithm='HS256'


def jwt_token(data:dict, exp_time:int=(24*60)):
    payload=data.copy()
    payload['exp']= datetime.now(timezone.utc) + timedelta(minutes=exp_time)

    return jwt.encode(payload,Jwt_Secret_Key,algorithm=Algorithm)

def jwt_decode(token: str):
    try:
        payload=jwt.decode(token,Jwt_Secret_Key,algorithms=[Algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None