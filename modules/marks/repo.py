from database import get_db

db = get_db()


def get_latest_marks(student_id: str) -> list[dict]:
    """Fetch all currently stored marks for a student — used for comparison."""
    try:
        data = db.table('marks_snapshots')\
            .select('*')\
            .eq('student_id', student_id)\
            .execute()
        return data.data
    except Exception as e:
        print(f"Error fetching stored marks: {e}")
        return []


def _make_key(mark: dict) -> str:
    """
    Builds a unique fingerprint for a single mark record.
    Two records are 'the same assessment' if course + assessment_type +
    assessment_name all match — obtained_marks is intentionally EXCLUDED
    from the key, so we can detect when a mark CHANGES, not just when
    a new one appears.
    """
    return f"{mark['course']}|{mark['assessment_type']}|{mark['assessment_name']}"


def detect_new_or_changed_marks(student_id: str, freshly_scraped: list[dict]) -> list[dict]:
    """
    Compares freshly scraped marks against what's already stored.
    Returns only the records that are NEW or have a DIFFERENT obtained_marks
    value than what's currently in the database.
    """
    stored = get_latest_marks(student_id)
    stored_lookup = {_make_key(m): m['obtained_marks'] for m in stored}

    changes = []
    for mark in freshly_scraped:
        key = _make_key(mark)

        if key not in stored_lookup:
            changes.append({**mark, 'change_type': 'new'})
        elif stored_lookup[key] != mark['obtained_marks']:
            changes.append({**mark, 'change_type': 'updated'})

    return changes


def save_marks_snapshot(student_id: str, marks: list[dict]) -> dict:
    """
    Inserts new/changed mark records into the database.
    Call detect_new_or_changed_marks() FIRST and pass only the results
    of that into here.
    """
    if not marks:
        return {'status': 'no_changes', 'inserted': 0}

    try:
        rows = [{
            'student_id':      student_id,
            'course':          m['course'],
            'assessment_type': m['assessment_type'],
            'assessment_name': m['assessment_name'],
            'obtained_marks':  m['obtained_marks'],
            'total_marks':     m['total_marks'],
        } for m in marks]

        data = db.table('marks_snapshots').insert(rows).execute()
        return {'status': 'success', 'inserted': len(data.data)}

    except Exception as e:
        return {'error': str(e)}


def process_scraped_marks(student_id: str, freshly_scraped: list[dict]) -> dict:
    """
    Main entry point after scraping.
    1. Detects what's new/changed
    2. Saves those to the database
    3. Returns the changes — caller uses this to trigger WhatsApp notifications
    """
    changes = detect_new_or_changed_marks(student_id, freshly_scraped)

    if not changes:
        print(f"[{student_id}] No new or changed marks")
        return {'status': 'no_changes', 'changes': []}

    save_result = save_marks_snapshot(student_id, changes)
    print(f"[{student_id}] {len(changes)} new/changed marks saved")

    return {
        'status': 'success',
        'changes': changes,
        'save_result': save_result
    }