// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken = "pk.eyJ1IjoiMzA0NDU1MWMiLCJhIjoiY21rY2hzM3gwMDEwazNncXljMmtkYXp1diJ9.tii63XPxMq2pdG9lKSn1QA";

const map = new mapboxgl.Map({
 container: 'map', // container element id
 style: 'mapbox://styles/mapbox/light-v10',
 center: [-0.089932, 51.514442],
 zoom: 14
});

const data_url = 
"https://api.mapbox.com/datasets/v1/3044551c/cmkwql7u702y41mnypquttwi7/features?access_token=pk.eyJ1IjoiMzA0NDU1MWMiLCJhIjoiY21rY2hzM3gwMDEwazNncXljMmtkYXp1diJ9.tii63XPxMq2pdG9lKSn1QA";

map.on('load', () => {
 map.addLayer({
 id: 'crimes',
 type: 'circle',
 source: {
 type: 'geojson',
 data: data_url 
 },
 paint: {
 'circle-radius': 10,
 'circle-color': '#eb4d4b',
 'circle-opacity': 0.9
 }
 });
  
  //Initialise the map filter
  filterMonth = ['==', ['get', 'Month'], '2024-01']
  filterType = ['!=', ['get', 'Crime type'], 'placeholder']
  
  map.setFilter('crimes', ['all', filterMonth, filterType])
  
  //Slider interaction code goes below
document.getElementById('slider').addEventListener('input', (event) => {
//Get the month value from the slider
 const month = parseInt(event.target.value);
 // get the correct format for the data
 formatted_month = '2024-' + ("0" + month).slice(-2)
 //Create a filter
 filterMonth = ['==', ['get', 'Month'], formatted_month]
 //set the map filter
 map.setFilter('crimes', ['all', filterMonth]);
 // update text in the UI
 document.getElementById('active-month').innerText = month;
});

   //Radio button interaction code goes below
document.getElementById('filters').addEventListener('change', (event) => {
 const type = event.target.value;
 console.log(type);
 // update the map filter
 if (type == 'all') {
 filterType = ['!=', ['get', 'Crime type'], 'placeholder'];
 } else if (type == 'shoplifting') {
 filterType = ['==', ['get', 'Crime type'], 'Shoplifting'];
 } else if (type == 'drugs') {
 filterType = ['==', ['get', 'Crime type'], 'Drugs'];
 } else {
 console.log('error');
 }
 map.setFilter('crimes', ['all', filterMonth, filterType]);
});
  
  });