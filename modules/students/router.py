from fastapi import APIRouter,HTTPException,Depends
from pydantic import BaseModel
from modules.students.repo import insert_student,update_whatsapp_number
from auth.deps import get_current_student

student_router=APIRouter(prefix="/students", tags=["students"])

class SignupCredentials(BaseModel):
    regno: str
    portal_password: str
    app_password: str
    whatsapp_number: str


@student_router.post('/signup')
def stu_signup(payload: SignupCredentials):
    result = insert_student(
        payload.regno,
        payload.portal_password,
        payload.app_password,
        payload.whatsapp_number
    )
    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])
    return result


@student_router.get('/me')
def get_my_profile(current_student: dict = Depends(get_current_student)):
    return current_student

@student_router.patch('/me/whatsapp')
def update_my_whatsapp(
    new_number: str,
    current_student: dict = Depends(get_current_student)
):
    return update_whatsapp_number(current_student['regno'], new_number)