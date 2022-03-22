import pyrealsense2 as rs
import numpy as np
import cv2
import random
import time

# Configure depth and color streams
pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.depth, 640, 480, rs.format.z16, 30)
config.enable_stream(rs.stream.color, 640, 480, rs.format.bgr8, 30)

# Start streaming
pipeline.start(config)

# Background subtraction parameters
first_pass = True
passes = 0

# Object detection parameters
num_frames = 0
punch_count = 0
punch_detected = False
DETECT_THRESH = 5
AREA_THRESH = 1500

# Fitness goal parameters
punch_goal = random.randint(10, 30)
round_over = False
DIFFICULTY = 1.5

# Set up a countdown timer
from threading import Thread, Event
class Countdown(Thread):
    def __init__(self, event, count):
        Thread.__init__(self)
        self.stopped = event
        self.count = count

    def setCount(self, count):
        self.count = count

    def getCount(self):
        return self.count

    def run(self):
        while(not self.stopped.wait(1)):
            if(self.count > 0):
                self.count-=1
            else:
                self.count=0
stop_flag = Event()
timer = Countdown(stop_flag, round(punch_goal*DIFFICULTY))
timer.start()
t_prev = timer.getCount()

try:
    while True:

        # Wait for a coherent pair of frames: depth and color
        frames = pipeline.wait_for_frames()
        depth_frame = frames.get_depth_frame()
        color_frame = frames.get_color_frame()
        if not depth_frame or not color_frame:
            continue

        # Convert images to numpy arrays
        depth_image = np.asanyarray(depth_frame.get_data())
        color_image = np.asanyarray(color_frame.get_data())
        color_image = color_image[50:430,150:500,:]

        # Threshold the image for color segmentation
        gray = cv2.cvtColor(color_image, cv2.COLOR_BGR2GRAY)
        gaussian_blur = cv2.GaussianBlur(gray, (21, 21), 0)
        blur = cv2.blur(gaussian_blur, (5, 5))
        # Subtract background (simplest approach)
        if first_pass:
            if(passes == 0):
                background = blur
            else:
                background = cv2.addWeighted(blur, 0.5, background, 0.5, 0)
            if(passes > 30):
                first_pass = False
            passes += 1
            continue
        foreground = cv2.subtract(blur, background)
        ret, thresh = cv2.threshold(blur, 190, 255, cv2.THRESH_BINARY)
        thresh = cv2.dilate(thresh, None, iterations=2)

        # Find contours around segmented 'blobs'
        contours, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, \
                cv2.CHAIN_APPROX_SIMPLE)

        # Set a placeholder output image
        img_out = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)

        # If we find any contours, get the largest one
        if len(contours) >= 1:
            contour = max(contours, key = lambda x: cv2.contourArea(x))
            if(cv2.contourArea(contour) > AREA_THRESH):
                # Create hull points for the largest contour
                hull = cv2.convexHull(contour, False)
                # Add contour and hull to the image for visualization
                color_contour = (0, 255, 0)
                color_hull    = (255, 255, 255)
                cv2.drawContours(img_out, [contour], 0, color_contour, 2, 8)
                cv2.drawContours(img_out, [hull], 0, color_hull, 2, 8)

                # Count the number of frames where an object was detected
                num_frames += 1
                # If object detected long enough, count it as a punch
                # avoid counting it more than once
                if (not punch_detected and (num_frames > DETECT_THRESH)):
                    punch_count += 1
                    punch_detected = True
            else:
                punch_detected = False
                num_frames = 0
        # Set the success parameters
        if(punch_count >= punch_goal):
            msg = "SUCCESS!"
            msg_color = (0,210,10)
            msg_pos = (55,280)
            round_over = True
        # Get the timer data
        t = timer.getCount()
        if(t != t_prev):
            t_prev = t
        if(t < 1):
            msg = "FAILED!"
            msg_color = (0,10,210)
            msg_pos = (75,280)
            round_over = True
        # Show images and fitness goal/counts
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.namedWindow('RealSense', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('RealSense', 800, 400)
        cv2.putText(img_out, "CNT:"+str(punch_count), (0,30), font, 1, (85,15,210), 3, cv2.LINE_AA)
        cv2.putText(img_out, "{:02d}".format(t), (140,200), font, 2, (255,255,255), 5, cv2.LINE_AA)
        cv2.putText(img_out, "TOT:"+str(punch_goal), (240,30), font, 1, (210,0,50), 3, cv2.LINE_AA)
        # Display message in between rounds
        if(round_over):
            cv2.putText(img_out, msg, msg_pos, font, 2, msg_color, 5, cv2.LINE_AA)
        cv2.imshow('RealSense', img_out)
        cv2.waitKey(1)
        # Reset all parameters before starting a new round
        if(round_over):
            punch_count = 0
            num_frames = 0
            punch_goal = random.randint(10,30)
            time.sleep(2)
            timer.setCount(round(punch_goal*DIFFICULTY))
            round_over = False

finally:

    # Stop streaming
    pipeline.stop()
    # Stop the countdown timer
    stop_flag.set()
