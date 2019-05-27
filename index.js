const request = require('request');
const parseString = require('xml2js').parseString;
const _ = require('lodash');
const moment = require('moment');

const PROXY = 'http://un:pw@proxy:port'

export const forecast = ({params}, res, next) =>{

  request({url:`ftp://ftp.bom.gov.au/anon/gen/fwo/${params.id}.xml`, proxy: PROXY}, (error, response, body) => {
	  if(error){
		  console.log(error)
	  }
	 parseString(body, (err, result) => {
    let clctn = []
    let foo = result.product.forecast[0].area[2]['forecast-period'];


    let splitElement = (element, type) => {
        let x = _.find(element, (o) => {
          return o.$.type == type
        })
        if(typeof(x) != 'undefined'){
        return x['_']
      }
        else{
          return '-'
        }
    }

    _.each(foo, (v,k) => {
      let obj = {};
      obj.date = moment(v['$']['start-time-local']).format('YYYY-MM-DD');
      obj.day_long = moment(v['$']['start-time-local']).format('dddd');
      obj.day_short = moment(v['$']['start-time-local']).format('ddd');
      obj.precip = splitElement(v.element, 'precipitation_range');
      obj.precip_pct = splitElement(v.text, 'probability_of_precipitation');
      obj.text = splitElement(v.text, 'precis');
      obj.icon =  splitElement(v.element, 'forecast_icon_code');
      obj.min = splitElement(v.element, 'air_temperature_minimum');
      obj.max = splitElement(v.element, 'air_temperature_maximum');
      clctn.push(obj)
      })

    res.status(200).json(clctn)
	});
});

}
/**
* @function getObservations
* @description gets weather data from BOM FTP and parses to json
* @param {string} state state as captialised 3 letters
* @param {string} station BOM weather station name e.g TOWNSVILLE AERO
* @returns {Object} as a promise
*/

let getObservations = (state, station) => {

  let clctn = [], foo, keyval, obj = {}, typeAry = [];
  return new Promise((resolve, reject) => {

   let stateLookup = [
      {state: 'NSW', code: 'N'},
      {state: 'NT', code: 'D'},
      {state: 'QLD', code: 'Q'},
      {state: 'TAS', code: 'V'},
      {state: 'SA', code: 'S'},
      {state: 'VIC', code: 'V'},
      {state: 'WA', code: 'W'}
    ]

    let code = _.find(stateLookup, {'state': state });

    request({url:`ftp://ftp.bom.gov.au/anon/gen/fwo/ID${code.code}60920.xml`,
            proxy: PROXY,
            headers:{'Cache-Control':'no-cache'}
            }, (error, response, body) => {
      //error handling
      if(error){
        return reject(error);
      }
      parseString(body, (err, result) => {
      //error Handlin
        if(err){

          return reject(err);
        }
        // Check wether Object exists for error Checking, reject if type is undefined
        if (typeof result === 'undefined') {

          return reject('Results are undefined')
        }

        let splitElement = (element, type) => {
            let x = _.find(element, (o) => {
              return o.$.type == type
            })
            if(typeof(x) != 'undefined'){
            return x['_']
          }
            else{
              return '-'
            }
        }



        _.each(result.product.observations[0].station, (v,k) => {
          if(v['$']['stn-name'] == station){
            keyval = k
          }
        })



        obj.name = result.product.observations[0].station[keyval]['$']['stn-name'];
        obj.lat = result.product.observations[0].station[keyval]['$']['lat'];
        obj.lon = result.product.observations[0].station[keyval]['$']['lon'];
        obj.dt = result.product.observations[0].station[keyval].period[0]['$']['time-local'];

        foo = result.product.observations[0].station[keyval].period[0].level[0];

        _.each(foo.element,(v,k) => {
          typeAry.push(v['$']['type']);
        })

        _.each(typeAry,(v) => {
          obj[v] = splitElement(foo.element, v);
        })
        clctn.push(obj);


        return resolve(obj);


      }) //end parseString
  }) // end request
}) // end promise
} // end function

export const observation = ({params, query}, res, next) => {

getObservations(params.id, query.stn).then((result) => {
  res.status(200).json(result);
}).catch((err) => {
  res.status(200).json({'error': err});
})
} //end


export const show = ({ params }, res, next) =>
  res.status(200).json({})
