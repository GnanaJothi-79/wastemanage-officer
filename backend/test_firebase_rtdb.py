import firebase_admin
from firebase_admin import credentials, db
import os

# Initialize Firebase
cred_path = "firebase/serviceAccountKey.json"
cred = credentials.Certificate(cred_path)

firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://smart-bin-979a2-default-rtdb.firebaseio.com/'
})

def test_firebase_connection():
    print("=" * 50)
    print("Testing Firebase Realtime Database Connection")
    print("=" * 50)
    
    try:
        # Test 1: Get root data
        print("\n1. Getting root data...")
        root_ref = db.reference('/')
        root_data = root_ref.get()
        print(f"Root data: {root_data}")
        
        # Test 2: Get bins data
        print("\n2. Getting bins data...")
        bins_ref = db.reference('/bins')
        bins_data = bins_ref.get()
        print(f"Bins data: {bins_data}")
        
        # Test 3: Check if bins exist
        if bins_data:
            print(f"\n3. Found {len(bins_data)} bins:")
            for key, value in bins_data.items():
                print(f"   - {key}: {value}")
        else:
            print("\n3. No bins found in /bins path!")
            
            # Try alternative paths
            print("\n4. Trying alternative paths...")
            alt_paths = ['/bin', '/bins_data', '/data/bins', '/smart_bins']
            for path in alt_paths:
                alt_ref = db.reference(path)
                alt_data = alt_ref.get()
                if alt_data:
                    print(f"   ✅ Found data at {path}: {alt_data}")
                else:
                    print(f"   ❌ No data at {path}")
        
        # Test 4: Check if we can write
        print("\n5. Testing write access...")
        test_ref = db.reference('/test_connection')
        test_ref.set({'test': 'connection_works'})
        test_data = test_ref.get()
        print(f"   Write test result: {test_data}")
        test_ref.delete()
        print("   ✅ Write test successful, cleaned up")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_firebase_connection()