#!/bin/python3
from flask import Flask, render_template, request
import json
from animate import animate

filename = "/boot/api_key.txt"
api_key = ''
with open(filename,'r') as f:
    api_key = f.read().splitlines()[0]
    f.close()

app = Flask(__name__,
            static_url_path='',
            static_folder='static',)

@app.route('/orbit')
def orbit():
    return render_template('orbit.html', api_key=api_key)

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/status', methods=['POST'])
def blink():
    status = {}
    req = request.get_json()
    if(req["next_pass"] is not None):
        show_animation(req["next_pass"])
        status["status"] = "OK"
    else:
        status["status"] = "NOT OK"
    return json.dumps(status)

def show_animation(time):
    if(time>60):
        animate(275./360,2)
        return
    if(time>1):
        animate(200./360,5)
        return
    animate(30./360,8)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
