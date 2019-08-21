#!/usr/bin/python
from Raspi_MotorHAT import Raspi_MotorHAT, Raspi_DCMotor

import time
import atexit

# create a default object, no changes to I2C address or frequency
mh = Raspi_MotorHAT(addr=0x6f)

# recommended for auto-disabling motors on shutdown!
def turnOffMotors():
	mh.getMotor(1).run(Raspi_MotorHAT.RELEASE)
	mh.getMotor(2).run(Raspi_MotorHAT.RELEASE)

atexit.register(turnOffMotors)

################################# DC motor test!
leftMotor = mh.getMotor(1)
rightMotor = mh.getMotor(2)

while (True):
	print "Forward! "
	leftMotor.run(Raspi_MotorHAT.FORWARD)
	rightMotor.run(Raspi_MotorHAT.FORWARD)

	print "\tSpeed up..."
	for i in range(255):
		leftMotor.setSpeed(i)
		rightMotor.setSpeed(i)
		time.sleep(0.01)

	print "\tSlow down..."
	for i in reversed(range(255)):
		leftMotor.setSpeed(i)
		rightMotor.setSpeed(i)
		time.sleep(0.01)

	print "Backward! "
	leftMotor.run(Raspi_MotorHAT.BACKWARD)
	rightMotor.run(Raspi_MotorHAT.BACKWARD)

	print "\tSpeed up..."
	for i in range(255):
		leftMotor.setSpeed(i)
		rightMotor.setSpeed(i)
		time.sleep(0.01)

	print "\tSlow down..."
	for i in reversed(range(255)):
		leftMotor.setSpeed(i)
		rightMotor.setSpeed(i)
		time.sleep(0.01)

	print "Release"
	leftMotor.run(Raspi_MotorHAT.RELEASE)
	rightMotor.run(Raspi_MotorHAT.RELEASE)
	time.sleep(1.0)
