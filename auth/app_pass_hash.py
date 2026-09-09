import bcrypt

def password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def password_verification(password: str, stored_hash: str) -> bool:
    try:
        pwd_bytes = password.encode('utf-8')[:72]
        hash_bytes = stored_hash.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as e:
        print(f"Password verification failed: {e}")
        return False