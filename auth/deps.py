from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from auth.jwt.api_security import jwt_decode
from modules.students.repo import get_student_by_id

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_student(token: str = Depends(oauth2_scheme)) -> dict:
    """
    This function gets INJECTED into any route that needs protection.
    FastAPI automatically:
    1. Reads the "Authorization: Bearer <token>" header from the request
    2. Extracts just the token part
    3. Passes it here as `token`
    """
    payload = jwt_decode(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    student_id = payload.get('student_id')
    if not student_id:
        raise HTTPException(status_code=401, detail="Token missing student_id")

    student = get_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=401, detail="Student not found")

    student.pop('app_password_hash', None)
    student.pop('password_enc', None)
    return student