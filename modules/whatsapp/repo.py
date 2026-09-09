from datetime import datetime, timezone
from database import get_db

db = get_db()


def get_last_refresh_time(student_id: str) -> datetime | None:
    """Fetch the latest refresh request timestamp for a student."""
    try:
        data = db.table('refresh_requests')\
            .select('requested_at')\
            .eq('student_id', student_id)\
            .order('requested_at', desc=True)\
            .limit(1)\
            .execute()

        if data.data:
            raw_ts = data.data[0]['requested_at']
            if isinstance(raw_ts, str):
                ts = datetime.fromisoformat(raw_ts.replace('Z', '+00:00'))
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                return ts
            elif isinstance(raw_ts, datetime):
                if raw_ts.tzinfo is None:
                    return raw_ts.replace(tzinfo=timezone.utc)
                return raw_ts
        return None
    except Exception as e:
        print(f"Error fetching last refresh time for {student_id}: {e}")
        return None


def record_refresh_request(student_id: str) -> dict:
    """Inserts a new refresh request record into refresh_requests table."""
    try:
        data = db.table('refresh_requests').insert({
            'student_id': student_id
        }).execute()
        return {'status': 'success', 'data': data.data[0]}
    except Exception as e:
        print(f"Error recording refresh request for {student_id}: {e}")
        return {'error': str(e)}


def can_refresh(student_id: str, cooldown_seconds: int = 300) -> bool:
    """
    Returns True if allowed to refresh, False if within cooldown_seconds (default 5 mins / 300s).
    """
    last_time = get_last_refresh_time(student_id)
    if not last_time:
        return True

    now = datetime.now(timezone.utc)
    elapsed = (now - last_time).total_seconds()
    return elapsed >= cooldown_seconds
