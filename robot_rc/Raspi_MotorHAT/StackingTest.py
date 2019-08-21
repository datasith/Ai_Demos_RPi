#!/usr/bin/python
from Raspi_MotorHAT import Raspi_MotorHAT, Raspi_DCMotor, Raspi_StepperMotor
import time
import atexit
import threading
import random

# bottom hat is default address 0x6f
bottomhat = Raspi_MotorHAT(addr=0x6f)
# top hat has A0 jumper closed, so its address 0x61
tophat = Raspi_MotorHAT(addr=0x61)

# create empty threads (these will hold the stepper 1, 2 & 3 threads)
stepperThreads = [threading.Thread(), threading.Thread(), threading.Thread()]

# recommended for auto-disabling motors on shutdown!
def turnOffMotors():
	tophat.getMotor(1).run(Raspi_MotorHAT.RELEASE)
	tophat.getMotor(2).run(Raspi_MotorHAT.RELEASE)
	tophat.getMotor(3).run(Raspi_MotorHAT.RELEASE)
	tophat.getMotor(4).run(Raspi_MotorHAT.RELEASE)
	bottomhat.getMotor(1).run(Raspi_MotorHAT.RELEASE)
	bottomhat.getMotor(2).run(Raspi_MotorHAT.RELEASE)
	bottomhat.getMotor(3).run(Raspi_MotorHAT.RELEASE)
	bottomhat.getMotor(4).run(Raspi_MotorHAT.RELEASE)

atexit.register(turnOffMotors)

myStepper1 = bottomhat.getStepper(200, 1)  	# 200 steps/rev, motor port #1
myStepper2 = bottomhat.getStepper(200, 2)  	# 200 steps/rev, motor port #2
myStepper3 = tophat.getStepper(200, 1)  	# 200 steps/rev, motor port #1

myStepper1.setSpeed(60)  		# 60 RPM
myStepper2.setSpeed(30)  		# 30 RPM
myStepper3.setSpeed(15)  		# 15 RPM

# get a DC motor!
myMotor = tophat.getMotor(3)
# set the speed to start, from 0 (off) to 255 (max speed)
myMotor.setSpeed(150)
# turn on motor
myMotor.run(Raspi_MotorHAT.FORWARD);


stepstyles = [Raspi_MotorHAT.SINGLE, Raspi_MotorHAT.DOUBLE, Raspi_MotorHAT.INTERLEAVE]
steppers = [myStepper1, myStepper2, myStepper3]

def stepper_worker(stepper, numsteps, direction, style):
	#print("Steppin!")
	stepper.step(numsteps, direction, style)
	#print("Done")

while (True):
	for i in range(3):
		if not stepperThreads[i].isAlive():
			randomdir = random.randint(0, 1)
			print("Stepper %d" % i),
			if (randomdir == 0):
        	                dir = Raspi_MotorHAT.FORWARD
	                        print("forward"),
			else:
	                        dir = Raspi_MotorHAT.BACKWARD
				print("backward"),
			randomsteps = random.randint(10,50)
			print("%d steps" % randomsteps)
			stepperThreads[i] = threading.Thread(target=stepper_worker, args=(steppers[i], randomsteps, dir, stepstyles[random.randint(0,len(stepstyles)-1)],))
			stepperThreads[i].start()

			# also, lets switch around the DC motor!
			myMotor.setSpeed(random.randint(0,255))  # random speed
			#myMotor.run(random.randint(0,1)) # random forward/back
