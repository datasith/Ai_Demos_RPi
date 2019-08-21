#!/usr/bin/python
'''
Motor control library for ACROBOTIC's
RPi4 wheeled robot PyPi!
'''
from Raspi_MotorHAT.Raspi_MotorHAT import Raspi_MotorHAT, Raspi_DCMotor
import time
import atexit

class MotorControl:

  def __init__(self):
    # create a default object, no changes to I2C address or frequency
    self.motorHat = Raspi_MotorHAT(addr=0x6f)
    self.leftMotor = self.motorHat.getMotor(1)
    self.rightMotor = self.motorHat.getMotor(2)
    atexit.register(self.disableMotors)

  # recommended for auto-disabling motors on shutdown!
  def disableMotors(self):
    self.leftMotor.run(Raspi_MotorHAT.RELEASE)
    self.rightMotor.run(Raspi_MotorHAT.RELEASE)

  # define functions for movement forward, backward, and turns
  def moveForward(self, speed=100):
    # expecting speed in the 0~100 range (%), thus need scaling to
    # 0~255 range
    speedPwm = int(speed*255/100)
    self.leftMotor.run(Raspi_MotorHAT.FORWARD)
    self.rightMotor.run(Raspi_MotorHAT.FORWARD)
    self.leftMotor.setSpeed(speedPwm)
    self.rightMotor.setSpeed(speedPwm)

  def moveBackward(self, speed=100):
    speedPwm = int(speed*255/100)
    self.leftMotor.run(Raspi_MotorHAT.BACKWARD)
    self.rightMotor.run(Raspi_MotorHAT.BACKWARD)
    self.leftMotor.setSpeed(speedPwm)
    self.rightMotor.setSpeed(speedPwm)

  def moveLeft(self, speed=100):
    speedPwm = int(speed*255/100)
    self.leftMotor.run(Raspi_MotorHAT.BACKWARD)
    self.rightMotor.run(Raspi_MotorHAT.FORWARD)
    self.leftMotor.setSpeed(speedPwm)
    self.rightMotor.setSpeed(speedPwm)

  def moveRight(self, speed=100):
    speedPwm = int(speed*255/100)
    self.leftMotor.run(Raspi_MotorHAT.FORWARD)
    self.rightMotor.run(Raspi_MotorHAT.BACKWARD)
    self.leftMotor.setSpeed(speedPwm)
    self.rightMotor.setSpeed(speedPwm)

  def moveStop(self):
    speedPwm = 0
    self.leftMotor.setSpeed(speedPwm)
    self.rightMotor.setSpeed(speedPwm)
    self.disableMotors()

# test the module's functionality
if __name__ == '__main__':
  mc = MotorControl()
  print('Moving Forward!')
  mc.moveForward(75)
  time.sleep(1)
  print('Moving Backward!')
  mc.moveBackward(50)
  time.sleep(1)
  print('Moving Left!')
  mc.moveLeft(100)
  time.sleep(1)
  print('Moving Right!')
  mc.moveRight(85)
  time.sleep(1)
  print('Stopping!')
  mc.moveStop()
  time.sleep(1)
