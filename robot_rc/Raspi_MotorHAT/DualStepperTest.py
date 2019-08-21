#!/usr/bin/python
from Raspi_MotorHAT import Raspi_MotorHAT, Raspi_DCMotor, Raspi_StepperMotor
import time
import atexit
import threading
import random

# create a default object, no changes to I2C address or frequency
mh = Raspi_MotorHAT(0x6F)

# create empty threads (these will hold the stepper 1 and 2 threads)
st1 = threading.Thread()
st2 = threading.Thread()


# recommended for auto-disabling motors on shutdown!
def turnOffMotors():
	mh.getMotor(1).run(Raspi_MotorHAT.RELEASE)
	mh.getMotor(2).run(Raspi_MotorHAT.RELEASE)
	mh.getMotor(3).run(Raspi_MotorHAT.RELEASE)
	mh.getMotor(4).run(Raspi_MotorHAT.RELEASE)

atexit.register(turnOffMotors)

myStepper1 = mh.getStepper(200, 1)  	# 200 steps/rev, motor port #1
myStepper2 = mh.getStepper(200, 2)  	# 200 steps/rev, motor port #1
myStepper1.setSpeed(60)  		# 30 RPM
myStepper2.setSpeed(60)  		# 30 RPM


stepstyles = [Raspi_MotorHAT.SINGLE, Raspi_MotorHAT.DOUBLE, Raspi_MotorHAT.INTERLEAVE, Raspi_MotorHAT.MICROSTEP]

def stepper_worker(stepper, numsteps, direction, style):
	#print("Steppin!")
	stepper.step(numsteps, direction, style)
	#print("Done")

while (True):
	if not st1.isAlive():
		randomdir = random.randint(0, 1)
		print("Stepper 1"),
		if (randomdir == 0):
			dir = Raspi_MotorHAT.FORWARD
			print("forward"),
		else:
			dir = Raspi_MotorHAT.BACKWARD
			print("backward"),
		randomsteps = random.randint(10,50)
		print("%d steps" % randomsteps)
		st1 = threading.Thread(target=stepper_worker, args=(myStepper1, randomsteps, dir, stepstyles[random.randint(0,3)],))
		st1.start()

	if not st2.isAlive():
		print("Stepper 2"),
		randomdir = random.randint(0, 1)
		if (randomdir == 0):
			dir = Raspi_MotorHAT.FORWARD
			print("forward"),
		else:
			dir = Raspi_MotorHAT.BACKWARD
			print("backward"),

		randomsteps = random.randint(10,50)		
		print("%d steps" % randomsteps)

		st2 = threading.Thread(target=stepper_worker, args=(myStepper2, randomsteps, dir, stepstyles[random.randint(0,3)],))
		st2.start()
