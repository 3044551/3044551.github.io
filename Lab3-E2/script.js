// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken = "pk.eyJ1IjoiMzA0NDU1MWMiLCJhIjoiY21rY2hzM3gwMDEwazNncXljMmtkYXp1diJ9.tii63XPxMq2pdG9lKSn1QA";

const style_2025 = "mapbox://styles/3044551c/cmkwno0mk001401sddm5r6w0x";
const style_2024 = "mapbox://styles/3044551c/cmkwm6brp005c01she23h6j46";

const map = new mapboxgl.Map({
 container: "map", // container ID
 style: style_2025,
 center: [-0.089932, 51.514441],
 zoom: 14
});

const layerList = document.getElementById("menu");
const inputs = layerList.getElementsByTagName("input");
//On click the radio button, toggle the style of the map.
for (const input of inputs) {
 input.onclick = (layer) => {
 if (layer.target.id == "style_2025") {
 map.setStyle(style_2025);
 }
 if (layer.target.id == "style_2024") {
 map.setStyle(style_2024);
 }
 };
}