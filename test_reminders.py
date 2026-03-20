#!/usr/bin/env python3
"""
Test script for workout reminder system
"""
import sys
sys.path.append('.')

def test_database_patterns():
    """Test workout pattern analysis"""
    try:
        import database as db_ops
        
        # Get all users who have worked out
        with db_ops.db() as conn:
            users = conn.execute("SELECT DISTINCT user_id FROM workouts LIMIT 5").fetchall()
        
        print("Testing workout patterns for users:")
        for user_row in users:
            user_id = user_row["user_id"]
            patterns = db_ops.get_workout_patterns(user_id, weeks=2)
            print(f"User {user_id}: {patterns}")
            
            # Test smart reminder logic
            total = patterns["total"]
            day_counts = patterns["day_counts"]
            
            if total >= 3:
                threshold = max(1, total // 4)
                common_days = [(i, count) for i, count in enumerate(day_counts) if count >= threshold]
                print(f"  Common workout days: {common_days}")
            else:
                print(f"  Not enough data (only {total} workouts)")
        
        print("\nDatabase test completed successfully!")
        return True
        
    except Exception as e:
        print(f"Database test failed: {e}")
        return False

def test_api_logic():
    """Test API logic without running server"""
    try:
        from datetime import date
        
        # Test day names
        DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        today = date.today().weekday()
        print(f"Today is {DAY_NAMES[today]} (weekday {today})")
        
        # Test reminder message generation
        test_patterns = [
            {"total": 5, "day_counts": {0: 2, 2: 3}, "last_workout_date": "2026-03-18"},
            {"total": 0, "day_counts": {}, "last_workout_date": None},
            {"total": 2, "day_counts": {1: 1, 3: 1}, "last_workout_date": "2026-03-15"}
        ]
        
        for i, patterns in enumerate(test_patterns):
            print(f"\nTest pattern {i+1}: {patterns}")
            total = patterns["total"]
            day_counts = patterns["day_counts"]
            
            if total < 3:
                print("  Result: Not enough data")
                continue
                
            threshold = max(1, total // 4)
            today_count = day_counts.get(today, 0)
            is_workout_day = today_count >= threshold
            
            if is_workout_day:
                message = f"Today is your {DAY_NAMES[today]} workout day! Get ready! 💪"
                print(f"  Result: {message}")
            else:
                print(f"  Result: No reminder needed (not a workout day)")
        
        print("\nAPI logic test completed successfully!")
        return True
        
    except Exception as e:
        print(f"API logic test failed: {e}")
        return False

if __name__ == "__main__":
    print("=== Workout Reminder System Test ===\n")
    
    # Test 1: Database patterns
    db_ok = test_database_patterns()
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: API logic
    api_ok = test_api_logic()
    
    print("\n" + "="*50)
    print("=== Test Summary ===")
    print(f"Database test: {'✅ PASS' if db_ok else '❌ FAIL'}")
    print(f"API logic test: {'✅ PASS' if api_ok else '❌ FAIL'}")
    
    if db_ok and api_ok:
        print("\n🎉 All tests passed! The reminder system should work correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
