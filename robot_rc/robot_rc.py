#!/usr/bin/python
'''
Flask-powered web app for remote control
of ACROBOTIC's wheeled robot PyPi
'''
from flask import Flask, render_template
# Use the socketio module for using websockets
# for easily handling requests in real-time
from flask_socketio import SocketIO, emit
from motor_control import MotorControl
from time import sleep

# Instantiate Flask class
app = Flask(__name__)
# Use the flask object to instantiate the SocketIO class
socketio = SocketIO(app)
# Create the motor control object
mc = MotorControl()

# Create the route(s) to access the web app
@app.route('/')
def handle_index():
  return render_template('index.html')

# Create the function handlers for the different websocket events
@socketio.on('req') # 'req' is an arbitrary name for my event
def on_message(msg):
  # I expect the message to be formatted in JSON so I can parse
  # it as a Python dictionary and look for specific keys
  direction = msg['direction'] # this will tell me how to move the motors
  if direction != 'STP':
    spd = int(msg['speed'])
    if direction == 'FWD':
      # Use the motor control object to move the motors
      mc.moveForward(speed=spd)
    if direction == 'BWD':
      mc.moveBackward(speed=spd)
    if direction == 'LFT':
      mc.moveLeft(speed=spd)
    if direction == 'RGT':
      mc.moveRight(speed=spd)
  else:
    mc.moveStop()
  # Send a response to the websocket client
  emit('rsp',{'status':'OK'})
@socketio.on('connect') # 'connect' is a pre-defined event
def on_connect():
  emit('rsp',{'status':'CONNECTED'})
@socketio.on('disconnect') # 'disconnect' is also a pre-defined event
def on_disconnect():
  print('Client disconnected')

# Main section of the web app
if __name__ == '__main__':
  socketio.run(app,host='0.0.0.0')
