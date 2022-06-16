const { appendFile } = require('fs');
const http = require('http');

const droneList;
const locationList;
const app = express();

app.use(express.urlencoded({extended: true}))

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Server up');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

app.use(express.json());

app.post('/drones', (req,res) => {
    //first we want to grab the list of drones out of the input and break it down into items we can use more easily, same with our locations later
    let droneItems = req.body[0].split(',');
    let drone = {name = "", weight = 0}
    droneItems.forEach(droneItem => {
        if(drone.name == ""){
            drone.name = droneItem;
        } else{
            drone.weight =  parseInt(droneItem);
            droneList.push(drone);
            drone =  {name = "", weight = 0}
        }
    })
    //Sorting the list here and on the locations so we are using the drones with the largest cargo with the largest locations
    droneList = droneList.sort(compareFunction)

    let counter = 0;
    locationList = new List();
    req.body.forEach(locationItem => {
        if(counter < 0){
            location = locationItem.split(',');
            _location = {name: location[0],weight: location[1]}
            locationList.add(_location);
        }
        counter++;
    });
    locationList = locationList.sort(compareFunction)
    //defining some counters we are going to use to keep track of our progress once we begin processing
    counter = 0;
    droneCounter = 0;
    let droneRemainder = 0;
    let droneRemainderLocations = [];
    let droneUses = [];
    locationList.forEach(location => {
        //here we go through and record the resulting drone usage from comparing weights
        let compareResults = weightCompare(location, droneCounter, droneRemainder)
        let droneUsage = {dronestring = droneList[droneCounter].name,locationStringList = [location.name]}
        //if there is a remander we need to instead of just pushing that to the list of uses record the other trips being made with the droneRemainderLocations
        if(compareResults.droneRemainder > 0){
            droneRemainder = compareResults.droneRemainder;
            droneRemainderLocations.push(location.name);
            //if there is more than one drone used we need to add the location to the list but the first drone in the list still needs to be added
            if(compareResults.droneCounter - droneCounter > 1){
                droneUses.push(droneUsage)
            }
        } else if(droneRemainderLocations != []){
            //Once we have used all the remainder on a particular drone we can add the list of locations for that trip
            droneRemainderLocations.push(location.name);
            droneUsage = {dronestring = droneList[droneCounter].name,locationStringList = droneRemainderLocations}
            droneUses.push(droneUsage)
            droneRemainderLocations = [];
        } else {
            //if this drone is used up just push that one into the list
            droneUses.push(droneUsage)
        }
        compareResults.droneCounter =  compareResults.droneCounter - droneCounter;
        //in cases where more than one drone is needed to completely serve a location we need to go through the results and grab all of them
        while(compareResults.droneCounter != 0){
            compareResults.droneCounter--;
            droneCounter++;
            droneUsage = {dronestring = droneList[droneCounter].name,locationStringList = [location.name]}
            droneUses.push(droneUsage)
        }
    })
    dronename = "";
    droneUses = droneUses.sort(sortDroneUses)
    droneOutput = {};
    droneTripList = [];
    droneUses.forEach(use =>{
        if(dronename == ""){
            dronename = use.dronestring;
            droneOutput = {name: dronestring, tripList: [use.locationStringList]};
        } else if( dronename == use.dronestring) {
            droneOutput.tripList.push(use.locationStringList);
        } else {
            droneTripList.push(droneOutput);
            dronename = use.dronestring;
            droneOutput = {name: dronestring, tripList: [use.locationStringList]};
        }
    })
    return droneTripList;
})

function weightCompare (location, _droneCounter, _droneRemainder){
    let droneCounter = _droneCounter;
    let locationRemainder;
    let droneRemainder = _droneRemainder;
    let counter;
    //This function serves to hit the actual calculations, if there was an amount of weight that was unused in a given drone it will use that same drone a second time, otherwise it will begin the process with a new drone.
    if(_droneRemainder > 0){
        let changes = weightCalculations(location.weight,_droneRemainder);
        let __return;
        if(droneCounter + changes[2] >= droneList.length){
            droneCounter = 0
        } else {
            droneCounter = droneCounter + changes[2]
        }
        ({ __return, droneCounter } = switchOnReturn(changes[0], droneRemainder + changes[1], droneCounter, counter + changes[3], locationRemainder+ changes[4]));
        return __return;
    } else {
        let changes = weightCalculations(location.weight,droneList[droneCounter].weight);
        let __return;
        
        if(droneCounter + changes[2] >= droneList.length){
            droneCounter = 0
        } else {
            droneCounter = droneCounter + changes[2]
        }
        ({ __return, droneCounter } = switchOnReturn(changes[0], droneRemainder + changes[1], droneCounter, counter + changes[3], locationRemainder+ changes[4]));
        return __return;
    }
}

function switchOnReturn(changes, droneRemainder, droneCounter, counter, locationRemainder) {
    switch (changes[0]) {
        case 0: //the drone matches the location weight perfectly, just return the updated numbers
            return { __return: [droneRemainder, droneCounter, counter, locationRemainder], droneCounter };
        case 1: //the drone didn't get all of the weight for the location, we need an additional drone
            droneCounter++;
            droneweight = droneList[droneCounter].weight;
            changes = weightCalculations(locationRemainder, droneweight);
            return switchOnReturn(changes[0], droneRemainder + changes[1], droneCounter+ changes[2], counter + changes[3], locationRemainder+ changes[4])
        case 2:// the drone has excess capacity for more locations this trip
            return { __return: [droneRemainder, droneCounter, counter, locationRemainder], droneCounter }

    }
}

function weightCalculations (){
    if(location - weight == 0){
        droneRemainder = 0;
        droneCounter = 1;
        counter = 1;
        locationRemainder = 0;
        return [0,droneRemainder,droneCounter,counter, locationRemainder]
    } else if(location - weight > 0){
        droneRemainder =0;
        droneCounter = 1;
        counter = 0;
        locationRemainder = location - weight;
        return [1,droneRemainder,droneCounter,counter, locationRemainder]
    } else if(location - weight < 0){
        droneRemainder = weight - location;
        droneCounter = 0;
        counter = 1;
        locationRemainder = 0;
        return [2,droneRemainder,droneCounter,counter, locationRemainder]
    }
}

function compareFunction (a, b) {
    return a.weight > b.weight;
}
function sortDroneUses (a, b) {
    return Array.from(a.dronestring)[0] > Array.from(b.dronestring)[0];
}
