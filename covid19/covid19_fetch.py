import datetime
import urllib2
import json
import time
import os, sys

url = "https://covid19.mathdro.id/api/daily"
dirname = "data"
filename = "data.json"
filepath = os.path.join(dirname,filename)

if not os.path.exists(dirname):
    os.mkdir(dirname)

if not os.path.isfile(filepath):
    with open(filepath,'w') as file:
	file.close()

dt = datetime.datetime(2020, 1, 22)
end = datetime.date.today()
end = datetime.datetime(end.year, end.month, end.day)
step = datetime.timedelta(hours=24)

region = "US"
#region = "China"

daily_confirmed = 0
daily_deaths = 0
daily_recovered = 0

data_out = {}
with open(filepath, "r+") as file:
    try:
        data_out = json.load(file)
    except:
        print("No JSON data found")
    while dt < end:
	date = dt.strftime('%m-%d-%Y')
        if date in data_out.keys():
            print("data found for "+date)
        else:
            print("fetching data for "+date)
	    response = urllib2.urlopen(url+'/'+date)
	    data_in = json.load(response)   
	    for d in data_in:
		if(region in d['countryRegion']):
		    try: 
			daily_confirmed+=int(d['confirmed'])
		    except ValueError:
			daily_confirmed+=0
		    try: 
			daily_deaths+=int(d['deaths'])
		    except ValueError:
			daily_deaths+=0
		    try: 
			daily_recovered+=int(d['recovered'])
		    except ValueError:
			daily_recovered+=0
            entry = {}
            entry["confirmed"] = str(daily_confirmed)
            entry["deaths"] = str(daily_deaths)
            entry["recovered"] = str(daily_recovered)
            data_out[date] = entry
	dt += step
	time.sleep(0.01)
    file.seek(0)
    file.write(json.dumps(data_out, sort_keys=True, 
               indent=4, separators=(',', ': ')))
    file.close()
