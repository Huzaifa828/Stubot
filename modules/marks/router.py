from fastapi import APIRouter,Depends
from auth.deps import get_current_student
from modules.marks.repo import get_latest_marks

marks_router=APIRouter(prefix='/marks',tags=['marks'])

@marks_router.get('/me')
def get_my_marks(current_student: dict = Depends(get_current_student)):
    student_id = current_student['id']
    return get_latest_marks(student_id)