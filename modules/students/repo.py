from database import get_db
from auth.app_pass_hash import password_hash,password_verification
db = get_db()


def insert_student(regno: str, portal_password: str, app_password:str ,whatsapp_number: str) -> dict:
    """
    Registers a new student.
    ⚠️ TEMPORARY: password stored as plain text — encrypt this before production.
    """
    try:
        existing = get_student_by_regno(regno)
        if existing:
            return {'error': 'Student already registered', 'student': existing}
        app_password=password_hash(app_password)
        data = db.table('students').insert({
            'regno': regno,
            'password_enc': portal_password,   # TODO: encrypt before storing
            'whatsapp_number': whatsapp_number,
            'app_password_hash': app_password
        }).execute()

        return {'status': 'success', 'student': data.data[0]}

    except Exception as e:
        return {'error': str(e)}


def get_student_by_regno(regno: str) -> dict | None:
    """Fetch a single student by their registration number."""
    try:
        data = db.table('students')\
            .select('*')\
            .eq('regno', regno)\
            .execute()

        if data.data:
            return data.data[0]
        return None

    except Exception as e:
        print(f"Error fetching student: {e}")
        return None


def get_student_by_id(student_id: str) -> dict | None:
    """Fetch a single student by their UUID."""
    try:
        data = db.table('students')\
            .select('*')\
            .eq('id', student_id)\
            .execute()

        if data.data:
            return data.data[0]
        return None

    except Exception as e:
        print(f"Error fetching student: {e}")
        return None


def get_all_students() -> list[dict]:
    """Fetch all registered students — used by batch_runner.py for scheduled jobs."""
    try:
        data = db.table('students')\
            .select('*')\
            .execute()
        return data.data
    except Exception as e:
        print(f"Error fetching students: {e}")
        return []


def update_whatsapp_number(regno: str, new_number: str) -> dict:
    """Allow a student to update their WhatsApp number."""
    try:
        data = db.table('students')\
            .update({'whatsapp_number': new_number})\
            .eq('regno', regno)\
            .execute()
        return {'status': 'success', 'student': data.data[0]}
    except Exception as e:
        return {'error': str(e)}



def verify_credentials(regno: str, password: str) -> dict | None:
    """
    Checks regno + app_password against the stored hash.
    Returns the student record (without sensitive fields) if valid, else None.
    """
    student = get_student_by_regno(regno)
    if not student:
        return None

    stored_hash = student.get('app_password_hash')
    if not stored_hash:
        return None

    try:
        if password_verification(password, stored_hash):
            student.pop('app_password_hash', None)
            student.pop('password_enc', None)
            return student
    except Exception as e:
        print(f"Password verification error for {regno}: {e}")

    return None


def get_student_by_whatsapp_number(whatsapp_number: str) -> dict | None:
    """Fetch a single student by their WhatsApp number with flexible phone matching."""
    try:
        clean = ''.join(filter(str.isdigit, str(whatsapp_number)))
        candidates = [whatsapp_number, clean]
        if clean.startswith('92'):
            candidates.append('0' + clean[2:])
            candidates.append('+' + clean)
        elif clean.startswith('0'):
            candidates.append('92' + clean[1:])
            candidates.append('+92' + clean[1:])

        for num in set(candidates):
            data = db.table('students')\
                .select('*')\
                .eq('whatsapp_number', num)\
                .execute()
            if data.data:
                return data.data[0]

        return None
    except Exception as e:
        print(f"Error fetching student by whatsapp number: {e}")
        return None