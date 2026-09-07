export const effects=[
 {type:1,name:'Water light',icon:'≋',color:'#76dfec',intensity:.42,scale:1,speed:1,detail:.5,hint:'Moving underwater refractions. Paint on stone, decks or tentacles to catch the light.'},
 {type:2,name:'Heat shimmer',icon:'♨',color:'#ffb868',intensity:.28,scale:1,speed:1,detail:.5,hint:'Rising distortion above a flame. Paint a narrow plume where the hot air should ripple.'},
 {type:3,name:'Star twinkle',icon:'✧',color:'#dbedff',intensity:.55,scale:1,speed:2,detail:.5,hint:'Twinkles bright pixels already in the image. Paint over the sky and adjust the brightness threshold.'},
 {type:4,name:'Drifting mist',icon:'☁',color:'#c4d5df',intensity:.48,scale:1,speed:1,detail:.5,hint:'Soft mist for chasms, haunted ruins or a cold deck. Adjust coverage and intensity for wisps or dense fog.'},
 {type:5,name:'Magic glow',icon:'✦',color:'#b78bff',intensity:.42,scale:1,speed:1,detail:.5,hint:'A slow breathing light. Paint around a crystal, rune or portal and choose its colour.'},
 {type:6,name:'Firelight',icon:'♧',color:'#ff9b37',intensity:.48,scale:1,speed:1,detail:.5,hint:'Warm, irregular flicker. Paint soft pools of light around your existing flames and braziers.'},
 {type:7,name:'Drifting motes',icon:'⁙',color:'#a4e7be',intensity:.8,scale:1,speed:1,detail:.35,hint:'Soft dust, warm embers or glowing fireflies. Paint their habitat and choose a style.'},
 {type:8,name:'Water motion',icon:'≈',color:'#76dfec',intensity:.24,scale:1,speed:1,detail:.5,hint:'Gently bends the image like moving water. Keep the mask inside pools or underwater areas.'},
 {type:9,name:'Precipitation',icon:'☂',color:'#c4dded',intensity:.48,scale:1,speed:2,detail:.35,variant:0,density:.38,direction:165,hint:'Layered rain streaks, drifting snow or windblown sand. Use global wind to steer the weather.'},
 {type:10,name:'Blowing leaves',icon:'❧',color:'#f5b7cf',intensity:.72,scale:1,speed:1,detail:.45,variant:0,density:.32,direction:75,hint:'Sakura petals or autumn leaves, carried and tumbled by the wind.'},
 {type:11,name:'Lightning',icon:'ϟ',color:'#d4deff',intensity:.45,scale:1,speed:1,detail:.4,variant:0,density:.28,direction:180,hint:'Distant sheet lightning by default. Choose Forked bolts for a visible strike; mask it to open sky.'},
 {type:12,name:'Smoke / steam',icon:'♨',color:'#b6bdc3',intensity:.55,scale:1,speed:1,detail:.5,variant:0,density:.5,direction:0,hint:'Rolling smoke or pale steam. Paint a plume above chimneys, vents or hot water.'},
 {type:13,name:'Cloud shadows',icon:'◒',color:'#64798c',intensity:.35,scale:2,speed:1,detail:.55,density:.5,hint:'Soft moving shade over outdoor terrain. Fill map for passing clouds; keep interiors clear.'},
 {type:14,name:'Sun shafts',icon:'☀',color:'#ffe1a3',intensity:.5,scale:1.6,speed:1,detail:.65,density:.6,direction:135,followWind:false,hint:'Soft angled light through trees, windows or a broken roof. Paint only the illuminated ground.'},
 {type:15,name:'Water ripples',icon:'◎',color:'#a6dce0',intensity:.4,scale:1,speed:1,detail:.45,density:.42,hint:'Expanding rings and soft glints. Paint ponds, flooded rooms or the sea; pair with gentle Water motion.'},
 {type:16,name:'Arcane portal',icon:'⟡',color:'#a58bff',intensity:.65,scale:1,speed:1,detail:.5,density:.5,followWind:false,hint:'Orbiting sigils around a luminous rift. Place its centre, then paint its area or use Fill map. Pattern size controls its radius.'}
];
export const styles={7:['Dust','Embers','Fireflies'],9:['Rain','Snow','Sandstorm'],10:['Sakura','Autumn'],11:['Sheet lightning','Forked bolts'],12:['Smoke','Steam']};
const variants={
 7:[{intensity:.6,density:.38,detail:.35,color:'#d0dbc9'},{intensity:.72,density:.35,detail:.35,color:'#ffae51'},{intensity:.75,density:.28,detail:.45,color:'#c9f58b'}],
 9:[{intensity:.48,density:.38,detail:.35,rainLength:.32,splash:.12},{intensity:.7,density:.6,detail:.5},{intensity:.5,density:.5,detail:.3}],
 11:[{intensity:.45,density:.28},{intensity:.6,density:.28}],
 12:[{intensity:.55,density:.5},{intensity:.45,density:.45}]
};
export function defaults(type,variant=0){return {density:.5,direction:0,variant,followWind:true,rainLength:.32,splash:.12,originX:.5,originY:.5,...effects.find(e=>e.type===type),...(variants[type]?.[variant]||{}),variant};}
