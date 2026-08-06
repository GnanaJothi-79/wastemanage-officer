import firebase_admin
from firebase_admin import credentials, db
import os
import json

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        # Check if already initialized
        if firebase_admin._apps:
            print("✅ Firebase already initialized")
            return
        
        # Try to get Firebase credentials from environment variable (Render)
        cred_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
        
        if cred_json:
            # Use credentials from environment variable (Render deployment)
            print("🔐 Using Firebase credentials from environment variable")
            try:
                cred_dict = json.loads(cred_json)
                cred = credentials.Certificate(cred_dict)
            except json.JSONDecodeError as e:
                print(f"❌ Error parsing FIREBASE_CREDENTIALS_JSON: {e}")
                return
        else:
            # Fallback: try local file (for local development)
            cred_path = os.getenv('FIREBASE_CREDENTIALS', 'firebase/serviceAccountKey.json')
            
            if not os.path.exists(cred_path):
                print(f"❌ Firebase credentials file not found at: {cred_path}")
                print("Please set FIREBASE_CREDENTIALS_JSON environment variable or place serviceAccountKey.json in firebase/ folder")
                return
            
            print(f"📁 Using Firebase credentials from file: {cred_path}")
            cred = credentials.Certificate(cred_path)
        
        # Initialize Firebase with Realtime Database URL
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://smart-bin-979a2-default-rtdb.firebaseio.com/'
        })
        print("✅ Firebase initialized successfully!")
        
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        import traceback
        traceback.print_exc()

# Initialize on import
initialize_firebase()

def get_rtdb():
    """Return Realtime Database reference"""
    return db

def get_firestore():
    """Return Firestore client (if needed)"""
    from firebase_admin import firestore
    return firestore.client()