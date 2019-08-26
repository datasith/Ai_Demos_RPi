#!/usr/bin/env python
from apds9960.const import *
from apds9960 import APDS9960
import RPi.GPIO as GPIO
import smbus
from time import sleep
from rpi_ws281x import PixelStrip, Color
import argparse

# Parameters for WS2812B LEDs
LED_COUNT = 60        # Number of LED pixels.
LED_PIN = 18          # GPIO pin connected to the pixels (18 uses PWM!).
# LED_PIN = 10        # GPIO pin connected to the pixels (10 uses SPI /dev/spidev0.0).
LED_FREQ_HZ = 800000  # LED signal frequency in hertz (usually 800khz)
LED_DMA = 10          # DMA channel to use for generating signal (try 10)
LED_BRIGHTNESS = 255  # Set to 0 for darkest and 255 for brightest
LED_INVERT = False    # True to invert the signal (when using NPN transistor level shift)
LED_CHANNEL = 0       # set to '1' for GPIOs 13, 19, 41, 45 or 53

# Parameters for APDS9960 gesture sensor
I2C_PORT = 1
dirs = {
    APDS9960_DIR_NONE: "none",
    APDS9960_DIR_LEFT: "left",
    APDS9960_DIR_RIGHT: "right",
    APDS9960_DIR_UP: "up",
    APDS9960_DIR_DOWN: "down",
    APDS9960_DIR_NEAR: "near",
    APDS9960_DIR_FAR: "far",
}

bus = smbus.SMBus(I2C_PORT)
apds = APDS9960(bus)
GPIO.setmode(GPIO.BOARD)
GPIO.setup(7, GPIO.IN)

def intH(channel):
    print("INTERRUPT")

strip = PixelStrip(LED_COUNT, LED_PIN, LED_FREQ_HZ, 
                   LED_DMA, LED_INVERT, LED_BRIGHTNESS, LED_CHANNEL)
strip.begin()

def colorWipe(strip, color, wait_ms=20):
    """Wipe color across display a pixel at a time."""
    for i in range(strip.numPixels()):
        strip.setPixelColor(i, color)
        strip.show()
        sleep(wait_ms / 1000.0)

def theaterChase(strip, color, wait_ms=20, iterations=10):
    """Movie theater light style chaser animation."""
    for j in range(iterations):
        for q in range(3):
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i + q, color)
            strip.show()
            sleep(wait_ms / 1000.0)
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i + q, 0)

def wheel(pos):
    """Generate rainbow colors across 0-255 positions."""
    if pos < 85:
        return Color(pos * 3, 255 - pos * 3, 0)
    elif pos < 170:
        pos -= 85
        return Color(255 - pos * 3, 0, pos * 3)
    else:
        pos -= 170
        return Color(0, pos * 3, 255 - pos * 3)

def rainbowCycle(strip, wait_ms=20, iterations=1):
    """Draw rainbow that uniformly distributes itself across all pixels."""
    for j in range(256 * iterations):
        for i in range(strip.numPixels()):
            strip.setPixelColor(i, wheel(
                (int(i * 256 / strip.numPixels()) + j) & 255))
        strip.show()
        sleep(wait_ms / 1000.0)

def theaterChaseRainbow(strip, wait_ms=20):
    """Rainbow movie theater light style chaser animation."""
    for j in range(256):
        for q in range(3):
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i + q, wheel((i + j) % 255))
            strip.show()
            sleep(wait_ms / 1000.0)
            for i in range(0, strip.numPixels(), 3):
                strip.setPixelColor(i + q, 0)

def stripClear():
    sleep(1)
    colorWipe(strip, Color(0, 0, 0), 10)

# Main program logic follows:
if __name__ == '__main__':
    try:
        GPIO.add_event_detect(7, GPIO.FALLING, callback = intH)
        apds.setProximityIntLowThreshold(50)
        apds.enableGestureSensor()
        while True:
            sleep(0.5)
            if apds.isGestureAvailable():
                motion = apds.readGesture()
                gesture = dirs.get(motion, "unknown")
                print("Gesture={}".format(gesture))
                if gesture == "up":
                    colorWipe(strip, Color(255, 0, 0))
                if gesture == "down":
                    colorWipe(strip, Color(0, 255, 0))
                if gesture == "right":
                    theaterChase(strip, Color(127, 127, 127))
                if gesture == "left":
                    rainbowCycle(strip)
                stripClear()
    except KeyboardInterrupt:
        stripClear()
    finally:
        GPIO.cleanup()
