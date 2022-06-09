#!/usr/bin/python
'''
Flask-powered web app for visualizing
YDLIDAR X4 data
'''
# Make the standard library 'play nicely'
from gevent import monkey
monkey.patch_all()
connections = 0;

from flask import Flask, render_template
from flask_socketio import SocketIO, emit
# Get the LIDAR data
import PyLidar3
import json
# Run the getData() function in the background
from threading import Thread
import time

# Configure the LIDAR interface
port = '/dev/ttyUSB0'
lidar = PyLidar3.YdLidarX4(port)
if(lidar.Connect()):
  print(lidar.GetDeviceInfo())

# Flask+SocketIO boilerplate code
app = Flask(__name__)
socketio = SocketIO(app)

# Initialize a global thread object
thread = None

# Run the getData() function continuously in the background to update
# _data object!
def background_getData():
  global connections
  scanning = False
  # Run continuously!
  while True:
    if connections > 0:
        # Connect if at least one Client is connected
        if not scanning: 
            gen = lidar.StartScanning()
            print('Start Scanning')
            scanning = True
        # Send how fast we're getting data from the device
        t0 = time.time()
        
        data = dict(next(gen))
        t = time.time()-t0
        # print(data)
        
        # Send the data in a websocket event, which I'll call 'message'
        socketio.emit('message', {'data': json.dumps(data),'time':'%.3f'%t})
    else: 
        # Disconnect when all coneections to clients are closed
        if scanning:
            lidar.StopScanning()
            print('Stop Scanning')
            scanning = False            
        time.sleep(3)

# When a client sends a request, get the LIDAR data
@app.route('/')
def index():
  global thread
  # Start the getData() thread when the client makes the first request
  if thread is None:
    thread = Thread(target=background_getData)
    thread.start()
  return render_template('index.html')

@socketio.on('my event')
def my_event(msg):
  print(msg['data'])
@socketio.on('connect')
def on_connect():
  global connections
  connections = connections + 1;
  emit('rsp',{'status':'CONNECTED'})
@socketio.on('disconnect')
def on_disconnect():
  global connections
  connections = connections - 1;
  print('Client disconnected!')

if __name__ == '__main__':
  socketio.run(app, host='0.0.0.0')
