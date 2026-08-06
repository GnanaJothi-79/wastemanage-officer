import firebase_admin
from firebase_admin import credentials, db
import os

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        if firebase_admin._apps:
            print("✅ Firebase already initialized")
            return
        
        # Get credentials path
        cred_path = os.getenv('FIREBASE_CREDENTIALS', 'firebase/serviceAccountKey.json')
        
        # Check if file exists
        if not os.path.exists(cred_path):
            print(f"❌ Firebase credentials file not found at: {cred_path}")
            return
        
        # Initialize
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://smart-bin-979a2-default-rtdb.firebaseio.com/'
        })
        print("✅ Firebase initialized successfully!")
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")

# Initialize on import
initialize_firebase()

def get_rtdb():
    """Return Realtime Database reference"""
    return db