from passlib.context import CryptContext

hash_method=CryptContext(schemes=['bcrypt'],deprecated='auto')

def password_hash(password:str) -> str:
    hashed=hash_method.hash(password)
    return hashed

def password_verification(password:str,stored_hash:str) -> bool:
    return hash_method.verify(password,stored_hash)