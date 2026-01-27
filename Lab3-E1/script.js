// The value for 'accessToken' begins with 'pk...'
mapboxgl.accessToken = "pk.eyJ1IjoiMzA0NDU1MWMiLCJhIjoiY21rY2hzM3gwMDEwazNncXljMmtkYXp1diJ9.tii63XPxMq2pdG9lKSn1QA";

//Before map-2024/11
const beforeMap = new mapboxgl.Map({
 container: "before",
 style: "mapbox://styles/3044551c/cmkwm6brp005c01she23h6j46",
 center: [-0.089932, 51.514441],
 zoom: 14
});

//After map-2025/11
const afterMap = new mapboxgl.Map({
 container: "after",
 style: "mapbox://styles/3044551c/cmkwno0mk001401sddm5r6w0x",
 center: [-0.089932, 51.514441],
 zoom: 14
});

// compare widget
const container = "#comparison-container";
const map = new mapboxgl.Compare(beforeMap, afterMap, container, {});