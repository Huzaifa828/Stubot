from supabase import create_client,Client
from config import SUPABASE_URL,SUPABASE_KEY

get_url=SUPABASE_URL
get_key=SUPABASE_KEY

supabase:Client=create_client(get_url,get_key)

def get_db():
    return supabase

