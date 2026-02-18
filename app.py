import cv2
import time
import os
import platform

# Function to make beep sound
def make_beep():
    """Play beep sound on any operating system"""
    try:
        if platform.system() == "Windows":
            import winsound
            winsound.Beep(1000, 500)  # 1000Hz for 0.5 seconds
        elif platform.system() == "Darwin":  # Mac
            os.system('afplay /System/Library/Sounds/Beep.aiff')
        else:  # Linux
            os.system('paplay /usr/share/sounds/alsa/Front_Left.wav')
    except:
        # Fallback - print beep
        print('\a')  # System beep

# Load face and eye detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Start camera
cap = cv2.VideoCapture(0)

# Variables
eyes_closed_time = 0
drowsy = False

print("🎥 SIMPLE DROWSINESS DETECTOR STARTED!")
print("📋 Close your eyes for 2 seconds to see alert!")
print("📋 Press 'q' to quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Convert to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    eyes_detected = False
    
    for (x, y, w, h) in faces:
        # Draw blue face rectangle
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
        
        # Look for eyes in face area
        roi_gray = gray[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 3)
        
        if len(eyes) >= 1:  # Eyes detected
            eyes_detected = True
            # Draw green eye rectangles
            for (ex, ey, ew, eh) in eyes:
                cv2.rectangle(frame, (x+ex, y+ey), (x+ex+ew, y+ey+eh), (0, 255, 0), 2)
    
    current_time = time.time()
    
    if eyes_detected:
        # Eyes are open - AWAKE
        eyes_closed_time = 0
        drowsy = False
        cv2.putText(frame, "AWAKE", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
    else:
        # Eyes not detected (closed)
        if eyes_closed_time == 0:
            eyes_closed_time = current_time
        
        # Check if eyes closed for 2 seconds
        if current_time - eyes_closed_time > 2:
            if not drowsy:
                drowsy = True
                # MAKE BEEP SOUND! 🔊
                make_beep()
                print("🚨 DROWSINESS DETECTED! BEEP BEEP!")
            
            # Show RED alert
            cv2.putText(frame, "WAKE UP!", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
            cv2.putText(frame, "DROWSY!", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        else:
            cv2.putText(frame, "Eyes Closed", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
    
    # Show the camera window
    cv2.imshow('Drowsiness Detector', frame)
    
    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Clean up
cap.release()
cv2.destroyAllWindows()
print("🛑 Detector stopped!")
